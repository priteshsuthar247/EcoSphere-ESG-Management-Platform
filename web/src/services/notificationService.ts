// Central in-app + email notification helpers

import pool from "@/config/db";
import logger from "@/lib/logger";
import { sendMail } from "@/lib/email";
import { escapeHtml } from "@/lib/htmlEscape";
import { getNotificationConfig, type NotificationConfig } from "@/services/systemConfig";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export type NotificationType =
  | "new_compliance_issue"
  | "csr_approval_decision"
  | "challenge_approval_decision"
  | "policy_acknowledgement_reminder"
  | "badge_unlocked"
  | "goal_deadline_approaching"
  | "reward_redemption"
  | "new_carbon_transaction";

function emailToggleForType(
  type: NotificationType,
  config: NotificationConfig,
): boolean {
  switch (type) {
    case "new_compliance_issue":
      return config.emailAlertsCompliance;
    case "reward_redemption":
      return config.emailAlertsRedemption;
    case "challenge_approval_decision":
      return config.emailAlertsChallenges;
    case "csr_approval_decision":
      return config.emailAlertsCsr;
    case "policy_acknowledgement_reminder":
      return config.emailAlertsPolicyReminders;
    case "badge_unlocked":
      return config.emailAlertsBadges;
    default:
      return true;
  }
}

/**
 * Create an in-app notification. Optionally send email when settings allow.
 */
export async function notifyUser(params: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
  emailSubject?: string;
  emailHtml?: string;
  /** Force-skip email even if enabled */
  skipEmail?: boolean;
}): Promise<void> {
  try {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO notifications
         (user_id, type, title, message, action_url, related_entity_type, related_entity_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        params.userId,
        params.type,
        params.title,
        params.message,
        params.actionUrl ?? null,
        params.relatedEntityType ?? null,
        params.relatedEntityId ?? null,
      ],
    );
  } catch (err) {
    logger.error("notifyUser insert failed", {
      error: (err as Error).message,
      userId: params.userId,
      type: params.type,
    });
    return;
  }

  if (params.skipEmail) return;

  try {
    const config = await getNotificationConfig();
    if (!emailToggleForType(params.type, config)) return;

    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT email, name FROM users WHERE id = ? AND status = 'active' LIMIT 1",
      [params.userId],
    );
    const user = rows[0];
    if (!user?.email) return;

    const html =
      params.emailHtml ??
      `<div style="font-family:sans-serif;padding:16px">
        <h2>${escapeHtml(params.title)}</h2>
        <p>${escapeHtml(params.message)}</p>
        <p style="color:#666;font-size:12px">EcoSphere notification</p>
      </div>`;

    sendMail({
      to: user.email,
      subject: params.emailSubject ?? params.title,
      html,
    }).catch((mailErr: Error) => {
      logger.error("notifyUser email failed", { error: mailErr.message });
    });
  } catch (err) {
    logger.warn("notifyUser email path failed", { error: (err as Error).message });
  }
}

/**
 * Remind active employees about policies they have not acknowledged.
 * Dedupes: one reminder per user+policy per 7 days.
 */
export async function sendPolicyAcknowledgementReminders(): Promise<number> {
  try {
    const [pending] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id AS user_id, u.name, u.email, p.id AS policy_id, p.title, p.version
       FROM users u
       CROSS JOIN esg_policies p
       WHERE u.status = 'active'
         AND u.role IN ('employee', 'departmental_head', 'ceo', 'admin')
         AND p.status = 'active'
         AND p.requires_acknowledgement = 1
         AND NOT EXISTS (
           SELECT 1 FROM policy_acknowledgements pa
           WHERE pa.user_id = u.id
             AND pa.policy_id = p.id
             AND pa.policy_version = p.version
         )
         AND NOT EXISTS (
           SELECT 1 FROM notifications n
           WHERE n.user_id = u.id
             AND n.type = 'policy_acknowledgement_reminder'
             AND n.related_entity_type = 'esg_policy'
             AND n.related_entity_id = p.id
             AND n.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
         )
       LIMIT 200`,
    );

    let count = 0;
    for (const row of pending) {
      await notifyUser({
        userId: Number(row.user_id),
        type: "policy_acknowledgement_reminder",
        title: "Policy acknowledgement required",
        message: `Please acknowledge policy "${row.title}" (v${row.version}).`,
        actionUrl: "/dashboard/governance/policies",
        relatedEntityType: "esg_policy",
        relatedEntityId: Number(row.policy_id),
        emailSubject: `Action required: acknowledge ${row.title}`,
        emailHtml: `
          <div style="font-family:sans-serif;padding:16px">
            <h2>Policy acknowledgement reminder</h2>
            <p>Hi ${escapeHtml(row.name)},</p>
            <p>Please acknowledge <strong>${escapeHtml(row.title)}</strong> (version ${escapeHtml(row.version)}) in EcoSphere.</p>
          </div>`,
      });
      count++;
    }
    if (count > 0) {
      logger.info("Policy acknowledgement reminders sent", { count });
    }
    return count;
  } catch (err) {
    logger.error("sendPolicyAcknowledgementReminders failed", {
      error: (err as Error).message,
    });
    return 0;
  }
}

/**
 * After overdue sync: notify owners of issues newly flagged overdue
 * (status already updated to overdue; notify once per day).
 */
export async function notifyNewlyOverdueCompliance(): Promise<number> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT ci.id, ci.title, ci.due_date, ci.owner_user_id
       FROM compliance_issues ci
       WHERE ci.status = 'overdue'
         AND ci.flagged_overdue = 1
         AND NOT EXISTS (
           SELECT 1 FROM notifications n
           WHERE n.user_id = ci.owner_user_id
             AND n.type = 'new_compliance_issue'
             AND n.related_entity_type = 'compliance_issue'
             AND n.related_entity_id = ci.id
             AND n.title LIKE 'Overdue:%'
             AND n.created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
         )
       LIMIT 100`,
    );

    let count = 0;
    for (const row of rows) {
      await notifyUser({
        userId: Number(row.owner_user_id),
        type: "new_compliance_issue",
        title: `Overdue: ${row.title}`,
        message: `Compliance issue "${row.title}" is past its due date (${String(row.due_date).slice(0, 10)}).`,
        actionUrl: "/dashboard/governance/compliance",
        relatedEntityType: "compliance_issue",
        relatedEntityId: Number(row.id),
        emailSubject: `Overdue compliance issue: ${row.title}`,
      });
      count++;
    }
    return count;
  } catch (err) {
    logger.error("notifyNewlyOverdueCompliance failed", {
      error: (err as Error).message,
    });
    return 0;
  }
}
