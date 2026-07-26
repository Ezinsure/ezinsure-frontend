type ApiFetch = (path: string, options?: RequestInit) => Promise<Response>;

export const CUSTOMER_RETENTION_ENDPOINTS = {
  clientInsuranceStats: '/getClientInsuranceStats',
} as const;

export async function fetchClientInsuranceStats(apiFetch: ApiFetch): Promise<unknown> {
  const response = await apiFetch(CUSTOMER_RETENTION_ENDPOINTS.clientInsuranceStats, {
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

  return payload;
}
