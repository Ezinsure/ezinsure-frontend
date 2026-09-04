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

  listBatches: (params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }): string => {
    const search = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') {
      search.set('status', params.status);
    }
    if (params?.startDate) search.set('startDate', params.startDate);
    if (params?.endDate) search.set('endDate', params.endDate);
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

  listLines: (params?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    externalVetId?: string;
  }): string => {
    const search = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') {
      search.set('status', params.status);
    }
    if (params?.startDate) search.set('startDate', params.startDate);
    if (params?.endDate) search.set('endDate', params.endDate);
    if (params?.externalVetId) search.set('externalVetId', params.externalVetId);
    const qs = search.toString();
    return qs ? `${BASE}/lines?${qs}` : `${BASE}/lines`;
  },

  markAwaitingSonarwaReimbursement: (): string =>
    `${BASE}/batches/markAwaitingSonarwaReimbursement`,

  markReimbursedBySonarwa: (): string =>
    `${BASE}/batches/markReimbursedBySonarwa`,

  getOverview: (): string => `${BASE}/overview`,

  getPerformance: (): string => `${BASE}/performance`,
} as const;
