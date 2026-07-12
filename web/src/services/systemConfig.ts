// Load platform settings (esg_config / notification_config) with safe defaults

import pool from "@/config/db";
import type { RowDataPacket } from "mysql2";

export type EsgConfig = {
  enableEmissionCalculation: boolean;
  requireCsrEvidence: boolean;
  autoAwardBadges: boolean;
  /** Default org weighting for overall ESG (must sum ~1.0) */
  weightEnvironmental: number;
  weightSocial: number;
  weightGovernance: number;
};

export type NotificationConfig = {
  emailAlertsCompliance: boolean;
  emailAlertsRedemption: boolean;
  emailAlertsChallenges: boolean;
  emailAlertsCsr: boolean;
  emailAlertsPolicyReminders: boolean;
  emailAlertsBadges: boolean;
};

const DEFAULT_ESG: EsgConfig = {
  enableEmissionCalculation: true,
  requireCsrEvidence: true,
  autoAwardBadges: true,
  weightEnvironmental: 0.4,
  weightSocial: 0.3,
  weightGovernance: 0.3,
};

const DEFAULT_NOTIFICATIONS: NotificationConfig = {
  emailAlertsCompliance: true,
  emailAlertsRedemption: true,
  emailAlertsChallenges: true,
  emailAlertsCsr: true,
  emailAlertsPolicyReminders: true,
  emailAlertsBadges: true,
};

async function readSetting(key: string): Promise<unknown> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT value FROM system_settings WHERE `key` = ? LIMIT 1",
      [key],
    );
    const raw = rows[0]?.value;
    if (raw == null) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return raw;
  } catch {
    return null;
  }
}

export async function getEsgConfig(): Promise<EsgConfig> {
  const value = (await readSetting("esg_config")) as Partial<EsgConfig> | null;
  return {
    enableEmissionCalculation:
      value?.enableEmissionCalculation ?? DEFAULT_ESG.enableEmissionCalculation,
    requireCsrEvidence: value?.requireCsrEvidence ?? DEFAULT_ESG.requireCsrEvidence,
    autoAwardBadges: value?.autoAwardBadges ?? DEFAULT_ESG.autoAwardBadges,
    weightEnvironmental:
      Number(value?.weightEnvironmental) || DEFAULT_ESG.weightEnvironmental,
    weightSocial: Number(value?.weightSocial) || DEFAULT_ESG.weightSocial,
    weightGovernance: Number(value?.weightGovernance) || DEFAULT_ESG.weightGovernance,
  };
}

export async function getNotificationConfig(): Promise<NotificationConfig> {
  const value = (await readSetting("notification_config")) as Partial<NotificationConfig> | null;
  return {
    emailAlertsCompliance:
      value?.emailAlertsCompliance ?? DEFAULT_NOTIFICATIONS.emailAlertsCompliance,
    emailAlertsRedemption:
      value?.emailAlertsRedemption ?? DEFAULT_NOTIFICATIONS.emailAlertsRedemption,
    emailAlertsChallenges:
      value?.emailAlertsChallenges ?? DEFAULT_NOTIFICATIONS.emailAlertsChallenges,
    emailAlertsCsr: value?.emailAlertsCsr ?? DEFAULT_NOTIFICATIONS.emailAlertsCsr,
    emailAlertsPolicyReminders:
      value?.emailAlertsPolicyReminders ?? DEFAULT_NOTIFICATIONS.emailAlertsPolicyReminders,
    emailAlertsBadges: value?.emailAlertsBadges ?? DEFAULT_NOTIFICATIONS.emailAlertsBadges,
  };
}
