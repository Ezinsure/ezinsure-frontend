/**
 * External vet commissions API route builders (backend contract).
 * All endpoints require Bearer auth.
 */

export const EXTERNAL_VET_COMMISSION_ENDPOINTS = {
  listExternalVets: (): string => `/external-vet-commissions/vets`,

  searchPlatformVets: (q: string): string => {
    const search = new URLSearchParams({ q });
    return `/external-vet-commissions/platform-vets/search?${search.toString()}`;
  },

  createExternalVet: (): string => `/external-vet-commissions/vets`,

  listBatches: (status?: string): string => {
    const search = new URLSearchParams();
    if (status && status !== 'ALL') search.set('status', status);
    const qs = search.toString();
    return qs
      ? `/external-vet-commissions/batches?${qs}`
      : `/external-vet-commissions/batches`;
  },

  getBatch: (id: string): string => `/external-vet-commissions/batches/${id}`,

  createBatch: (): string => `/external-vet-commissions/batches`,

  approveBatch: (id: string): string =>
    `/external-vet-commissions/batches/${id}/approve`,

  rejectBatch: (id: string): string =>
    `/external-vet-commissions/batches/${id}/reject`,

  initiatePayment: (id: string): string =>
    `/external-vet-commissions/batches/${id}/initiate-payment`,

  markPaid: (id: string): string =>
    `/external-vet-commissions/batches/${id}/mark-paid`,

  initiatePaymentBulk: (): string =>
    `/external-vet-commissions/batches/initiate-payment`,

  markPaidBulk: (): string => `/external-vet-commissions/batches/mark-paid`,

  getOverview: (): string => `/external-vet-commissions/overview`,

  getPerformance: (): string => `/external-vet-commissions/performance`,
} as const;
