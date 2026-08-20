/**
 * External vet commissions API route builders.
 * Paths match production Swagger (camelCase), e.g. `/externalVetCommissions/...`.
 * All endpoints require Bearer auth.
 */

const BASE = '/externalVetCommissions';

export const EXTERNAL_VET_COMMISSION_ENDPOINTS = {
  listExternalVets: (): string => `${BASE}/vets`,

  searchPlatformVets: (q: string): string => {
    const search = new URLSearchParams({ q });
    return `${BASE}/platformVets/search?${search.toString()}`;
  },

  createExternalVet: (): string => `${BASE}/vets`,

  listBatches: (status?: string): string => {
    const search = new URLSearchParams();
    if (status && status !== 'ALL') search.set('status', status);
    const qs = search.toString();
    return qs ? `${BASE}/batches?${qs}` : `${BASE}/batches`;
  },

  getBatch: (id: string): string => `${BASE}/batches/${id}`,

  createBatch: (): string => `${BASE}/batches`,

  approveBatch: (id: string): string => `${BASE}/batches/${id}/approve`,

  rejectBatch: (id: string): string => `${BASE}/batches/${id}/reject`,

  initiatePayment: (id: string): string =>
    `${BASE}/batches/${id}/initiatePayment`,

  markPaid: (id: string): string => `${BASE}/batches/${id}/markPaid`,

  initiatePaymentBulk: (): string => `${BASE}/batches/initiatePayment`,

  markPaidBulk: (): string => `${BASE}/batches/markPaid`,

  getOverview: (): string => `${BASE}/overview`,

  getPerformance: (): string => `${BASE}/performance`,
} as const;
