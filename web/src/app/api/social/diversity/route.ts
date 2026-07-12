// src/app/api/social/diversity/route.ts
// GET /api/social/diversity — diversity metrics (admin / ceo)

import { NextRequest } from 'next/server';
import { getDiversitySnapshot } from '@/services/diversityService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { getAuthUser, hasRole, SOCIAL_DIVERSITY_ROLES } from '@/lib/requestAuth';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, SOCIAL_DIVERSITY_ROLES)) {
      return errorResponse('Access denied. Admin or CEO role required.', 403, 'FORBIDDEN');
    }

    const snapshot = await getDiversitySnapshot();
    return successResponse(snapshot, 'Diversity metrics retrieved');
  } catch (err) {
    logger.error('GET /api/social/diversity error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
