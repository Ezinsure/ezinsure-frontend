import type { VeterinaryApplication, VeterinaryApplicationsResponse } from '@/features/vet-portal/types';
import {
  LIVESTOCK_LIST_DEFAULT_PAGE_SIZE,
  LIVESTOCK_VET_ENDPOINTS,
} from '@/features/livestock-application/api/endpoints';
import type { ApiFetch } from '@/features/livestock-application/api/http';
import { requestJson } from '@/features/livestock-application/api/http';
import {
  extractApplicationsListPaginationMeta,
  extractApplicationsRawRows,
} from '@/features/livestock-application/api/mappers/list.mapper';

export type { ApiFetch };

export interface GetVeterinaryApplicationsParams {
  agentId?: string;
  startDate: string;
  endDate: string;
  pageNumber?: number;
  pageSize?: number;
}

export async function getVeterinaryApplications(
  apiFetch: ApiFetch,
  params: GetVeterinaryApplicationsParams,
): Promise<VeterinaryApplicationsResponse> {
  const pageNumber = params.pageNumber ?? 1;
  const pageSize = params.pageSize ?? LIVESTOCK_LIST_DEFAULT_PAGE_SIZE;

  const payload = await requestJson<unknown>(
    apiFetch,
    LIVESTOCK_VET_ENDPOINTS.listApplications({
      agentId: params.agentId,
      startDate: params.startDate,
      endDate: params.endDate,
      pageNumber,
      pageSize,
    }),
    { method: 'GET' },
  );

  const data = extractApplicationsRawRows(payload) as VeterinaryApplication[];
  const pagination = extractApplicationsListPaginationMeta(payload, {
    pageNumber,
    pageSize,
    dataLength: data.length,
  });

  return { data, ...pagination };
}
