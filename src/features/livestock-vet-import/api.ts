import type { VeterinaryApplicationsResponse } from '@/features/vet-portal/types';

type ApiFetch = (path: string, options?: RequestInit) => Promise<Response>;

export async function getVeterinaryApplications(
  apiFetch: ApiFetch,
  params: { agentId: string; startDate: string; endDate: string },
): Promise<VeterinaryApplicationsResponse> {
  const search = new URLSearchParams({
    agentId: params.agentId,
    startDate: params.startDate,
    endDate: params.endDate,
  });

  const response = await apiFetch(`/getVeterinaryApplications?${search.toString()}`, {
    method: 'GET',
  });

  let payload: unknown = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const p = payload as { message?: string; error?: string };
    throw new Error(p.message || p.error || `Failed to fetch applications (${response.status})`);
  }

  return payload as VeterinaryApplicationsResponse;
}
