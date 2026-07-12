// GET latest scores | POST recalculate department ESG scores (admin/ceo)

import { NextRequest } from "next/server";
import {
  recalculateDepartmentEsgScores,
  getLatestDepartmentScores,
  getOrgOverallEsgScore,
} from "@/services/esgScoreService";
import { successResponse, errorResponse } from "@/utils/apiResponse";
import { getAuthUser, hasRole } from "@/lib/requestAuth";
import type { UserRole } from "@/lib/auth";
import logger from "@/lib/logger";

const FULL: UserRole[] = ["admin", "ceo"];
const READ: UserRole[] = ["admin", "ceo", "departmental_head"];

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, READ)) {
      return errorResponse("Access denied.", 403, "FORBIDDEN");
    }
    const [departments, overall] = await Promise.all([
      getLatestDepartmentScores(),
      getOrgOverallEsgScore(),
    ]);
    return successResponse({ departments, overall }, "ESG scores retrieved");
  } catch (err) {
    logger.error("GET /api/reports/scores error", { error: (err as Error).message });
    return errorResponse("Internal server error", 500, "SERVER_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, FULL)) {
      return errorResponse("Access denied. Admin or CEO required.", 403, "FORBIDDEN");
    }
    const departments = await recalculateDepartmentEsgScores();
    const overall = await getOrgOverallEsgScore();
    logger.info("ESG scores recalculated via API", { by: user!.id });
    return successResponse(
      { departments, overall },
      "Department ESG scores recalculated",
    );
  } catch (err) {
    logger.error("POST /api/reports/scores error", { error: (err as Error).message });
    return errorResponse("Internal server error", 500, "SERVER_ERROR");
  }
}
