// src/app/api/social/diversity/route.ts
// GET /api/social/diversity — diversity metrics (admin / ceo)

import { NextRequest } from 'next/server';
import { getDiversitySnapshot } from '@/services/diversityService';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { getAuthUser, hasRole, SOCIAL_DIVERSITY_ROLES } from '@/lib/requestAuth';
import { filterRowsBySearch } from '@/lib/listFilters';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!hasRole(user, SOCIAL_DIVERSITY_ROLES)) {
      return errorResponse('Access denied. Admin or CEO role required.', 403, 'FORBIDDEN');
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();

    const snapshot = await getDiversitySnapshot();

    // Server-side matrix filter (aggregated data — filter in route)
    if (search) {
      snapshot.by_gender = filterRowsBySearch(snapshot.by_gender, search, (r) => [r.gender]);
      snapshot.by_role = filterRowsBySearch(snapshot.by_role, search, (r) => [r.role]);
      snapshot.by_department = filterRowsBySearch(snapshot.by_department, search, (r) => [
        r.department_name,
        r.department_id,
      ]);
      snapshot.by_age_band = filterRowsBySearch(snapshot.by_age_band, search, (r) => [r.band]);
      snapshot.gender_by_department = filterRowsBySearch(
        snapshot.gender_by_department,
        search,
        (r) => [r.department_name, r.gender],
      );
    }

    return successResponse(snapshot, 'Diversity metrics retrieved');
  } catch (err) {
    logger.error('GET /api/social/diversity error', {
      error: (err as Error).message,
    });
    return errorResponse('Internal server error', 500, 'SERVER_ERROR');
  }
}
