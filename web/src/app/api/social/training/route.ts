// GET/POST employee training completions

import { NextRequest } from "next/server";
import {
  listTrainings,
  createTraining,
  getTrainingStats,
} from "@/services/trainingService";
import { successResponse, errorResponse } from "@/utils/apiResponse";
import { getAuthUser, hasRole } from "@/lib/requestAuth";
import type { UserRole } from "@/lib/auth";
import logger from "@/lib/logger";

const READ_ROLES: UserRole[] = ["admin", "ceo", "departmental_head", "employee"];
const MANAGE_ROLES: UserRole[] = ["admin", "ceo", "departmental_head"];

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, READ_ROLES)) {
      return errorResponse("Access denied.", 403, "FORBIDDEN");
    }

    const isEmployee = user!.role === "employee";
    const deptFilter =
      user!.role === "departmental_head" ? user!.department_id : undefined;

    const [items, stats] = await Promise.all([
      listTrainings(
        isEmployee
          ? { userId: user!.id }
          : deptFilter != null
            ? { departmentId: deptFilter }
            : undefined,
      ),
      getTrainingStats(
        isEmployee
          ? undefined
          : deptFilter != null
            ? { departmentId: deptFilter }
            : undefined,
      ),
    ]);

    // Employee stats: only own
    const employeeStats = isEmployee
      ? {
          total: items.length,
          employees_trained: items.length > 0 ? 1 : 0,
          total_hours: items.reduce((s, t) => s + (t.hours ?? 0), 0),
        }
      : stats;

    return successResponse(
      {
        items,
        stats: employeeStats,
        viewer: { id: user!.id, role: user!.role, canManage: hasRole(user, MANAGE_ROLES) },
      },
      "Training records retrieved",
    );
  } catch (err) {
    logger.error("GET /api/social/training error", { error: (err as Error).message });
    return errorResponse("Internal server error", 500, "SERVER_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, READ_ROLES)) {
      return errorResponse("Access denied.", 403, "FORBIDDEN");
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }
    if (!body || typeof body !== "object") {
      return errorResponse("Invalid payload", 400, "VALIDATION_ERROR");
    }

    const {
      training_name,
      category,
      completion_date,
      hours,
      certificate_url,
      user_id,
    } = body as Record<string, unknown>;

    if (typeof training_name !== "string" || training_name.trim().length < 2) {
      return errorResponse("training_name is required", 400, "VALIDATION_ERROR");
    }
    if (
      typeof completion_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(completion_date)
    ) {
      return errorResponse("completion_date must be YYYY-MM-DD", 400, "VALIDATION_ERROR");
    }

    // Employees can only log for themselves; managers may log for others
    let targetUserId = user!.id;
    if (user_id !== undefined && user_id !== null && user_id !== "") {
      const uid = Number(user_id);
      if (!Number.isInteger(uid) || uid <= 0) {
        return errorResponse("Invalid user_id", 400, "VALIDATION_ERROR");
      }
      if (uid !== user!.id && !hasRole(user, MANAGE_ROLES)) {
        return errorResponse("Cannot log training for another user", 403, "FORBIDDEN");
      }
      targetUserId = uid;
    }

    const created = await createTraining({
      user_id: targetUserId,
      training_name,
      category: typeof category === "string" ? category : null,
      completion_date,
      hours: hours === null || hours === undefined || hours === "" ? null : Number(hours),
      certificate_url: typeof certificate_url === "string" ? certificate_url : null,
    });

    return successResponse(created, "Training recorded", 201);
  } catch (err) {
    logger.error("POST /api/social/training error", { error: (err as Error).message });
    return errorResponse("Internal server error", 500, "SERVER_ERROR");
  }
}
