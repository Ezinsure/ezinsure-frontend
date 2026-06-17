import type { VeterinaryApplication, VeterinaryApplicationsResponse } from '@/features/vet-portal/types';
import { LIVESTOCK_VET_ENDPOINTS } from '@/features/livestock-application/api/endpoints';
import type { ApiFetch } from '@/features/livestock-application/api/http';
import { requestJson } from '@/features/livestock-application/api/http';
import { extractApplicationsRawRows } from '@/features/livestock-application/api/mappers/list.mapper';

export type { ApiFetch };

export async function getVeterinaryApplications(
  apiFetch: ApiFetch,
  params: { agentId: string; startDate: string; endDate: string },
): Promise<VeterinaryApplicationsResponse> {
  const payload = await requestJson<unknown>(
    apiFetch,
    LIVESTOCK_VET_ENDPOINTS.listApplications(params),
    { method: 'GET' },
  );

  const data = extractApplicationsRawRows(payload) as VeterinaryApplication[];
  return { data };
}
