import {
  LIVESTOCK_LIST_DEFAULT_PAGE_SIZE,
  LIVESTOCK_SONARWA_ENDPOINTS,
  type SonarwaReviewScope,
} from '@/features/livestock-application/api/endpoints';
import {
  type ApiFetch,
  requestJson,
} from '@/features/livestock-application/api/http';
import {
  extractApplicationsListPaginationMeta,
  mapApplicationsListResponse,
} from '@/features/livestock-application/api/mappers';
import { cacheLivestockApplicationRows } from '@/features/livestock-application/api/livestock-application-session-cache';
import type { LivestockApplicationsListResponse } from '@/features/livestock-application/domain/application-types';

export interface ListSonarwaApplicationsQuery {
  startDate: string;
  endDate: string;
  pageNumber?: number;
  pageSize?: number;
  /** `pending` = awaiting decision; `all` = at or past SONARWA review. */
  reviewScope?: SonarwaReviewScope;
}

/**
 * Server-paginated livestock applications for the SONARWA portal.
 * Backend: GET `/getSonarwaLivestockApplications`
 */
export async function listSonarwaLivestockApplications(
  apiFetch: ApiFetch,
  query: ListSonarwaApplicationsQuery,
): Promise<LivestockApplicationsListResponse> {
  const pageNumber = query.pageNumber ?? 1;
  const pageSize = query.pageSize ?? LIVESTOCK_LIST_DEFAULT_PAGE_SIZE;
  const reviewScope = query.reviewScope ?? 'pending';

  const payload = await requestJson<unknown>(
    apiFetch,
    LIVESTOCK_SONARWA_ENDPOINTS.listApplications({
      startDate: query.startDate,
      endDate: query.endDate,
      pageNumber,
      pageSize,
      reviewScope,
    }),
    { method: 'GET' },
    'list',
  );

  const data = mapApplicationsListResponse(payload);
  cacheLivestockApplicationRows(data);

  const pagination = extractApplicationsListPaginationMeta(payload, {
    pageNumber,
    pageSize,
    dataLength: data.length,
  });

  return {
    data,
    meta: {
      total: pagination.total,
      startDate: query.startDate,
      endDate: query.endDate,
      pageNumber: pagination.pageNumber,
      pageSize: pagination.pageSize,
      totalPages: pagination.totalPages,
    },
  };
}
