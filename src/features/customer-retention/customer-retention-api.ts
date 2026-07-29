type ApiFetch = (path: string, options?: RequestInit) => Promise<Response>;

export interface ClientInsuranceStatsQuery {
  startDate: string;
  endDate: string;
}

export interface ClientInsuranceStats {
  totalClients: number;
  ongoingInsurance: number;
  renewedAtLeastOnce: number;
  neverRenewed: number;
}

interface ClientInsuranceStatsResponse {
  success?: boolean;
  data?: Partial<ClientInsuranceStats>;
}

export const CUSTOMER_RETENTION_ENDPOINTS = {
  clientInsuranceStats: ({ startDate, endDate }: ClientInsuranceStatsQuery): string => {
    const params = new URLSearchParams({ startDate, endDate });
    return `/getClientInsuranceStats?${params.toString()}`;
  },
} as const;

export async function fetchClientInsuranceStats(
  apiFetch: ApiFetch,
  query: ClientInsuranceStatsQuery,
): Promise<ClientInsuranceStats> {
  const response = await apiFetch(CUSTOMER_RETENTION_ENDPOINTS.clientInsuranceStats(query), {
    method: 'GET',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === 'object' &&
      'message' in payload &&
      typeof (payload as { message: unknown }).message === 'string'
        ? (payload as { message: string }).message
        : `Failed to load client insurance stats (${response.status})`;
    throw new Error(message);
  }

  const responsePayload = (payload ?? {}) as ClientInsuranceStatsResponse;
  const data = responsePayload.data;

  if (!data || typeof data !== 'object') {
    throw new Error('Client insurance stats returned an invalid response');
  }

  return {
    totalClients: Number(data.totalClients ?? 0),
    ongoingInsurance: Number(data.ongoingInsurance ?? 0),
    renewedAtLeastOnce: Number(data.renewedAtLeastOnce ?? 0),
    neverRenewed: Number(data.neverRenewed ?? 0),
  };
}
