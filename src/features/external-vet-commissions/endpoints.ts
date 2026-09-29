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
    /** When true, backend should return only batches for the authenticated vet. */
    mine?: boolean;
  }): string => {
    const search = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') {
      search.set('status', params.status);
    }
    if (params?.startDate) search.set('startDate', params.startDate);
    if (params?.endDate) search.set('endDate', params.endDate);
    if (params?.mine) search.set('mine', 'true');
    const qs = search.toString();
    return qs ? `${BASE}/batches?${qs}` : `${BASE}/batches`;
  },

  /** Resolve ExternalVet registry row for the authenticated VETERINARY user. */
  myExternalVet: (): string => `${BASE}/vets/me`,

  getBatch: (id: string): string => `${BASE}/batches/${id}`,

  /**
   * Authenticated stream (or JSON `{ url }` signed redirect) for the original
   * claim-form workbook. Prefer this over fetching `sourceDocumentUrl` in the
   * browser — Cloudinary raw/authenticated assets are often CORS-blocked.
   */
  downloadSourceDocument: (id: string): string =>
    `${BASE}/batches/${id}/sourceDocument`,

  createBatch: (): string => `${BASE}/batches`,

  /** Edit payee / replace sheet while DRAFT | REJECTED. */
  updateBatch: (id: string): string => `${BASE}/batches/${id}`,

  /** PENDING_*_REVIEW → DRAFT (reason required). */
  withdrawBatch: (id: string): string => `${BASE}/batches/${id}/withdraw`,

  approveBatch: (id: string): string => `${BASE}/batches/${id}/approve`,

  rejectBatch: (id: string): string => `${BASE}/batches/${id}/reject`,

  /** DRAFT | REJECTED → PENDING_SONARWA_REVIEW */
  submitBatch: (id: string): string => `${BASE}/batches/${id}/submit`,

  /** PENDING_SONARWA_REVIEW → PENDING_ADMIN_REVIEW (all lines reviewed). */
  sendToAdminReview: (id: string): string =>
    `${BASE}/batches/${id}/sendToAdminReview`,

  /**
   * Decide a single insured line (approve / reject) with optional reason.
   * Body: `{ decision, reason?, stage }`
   */
  reviewLine: (batchId: string, lineId: string): string =>
    `${BASE}/batches/${batchId}/lines/${lineId}/review`,

  /**
   * Bulk decide lines in one batch.
   * Body: `{ lineIds, decision, reason?, stage }`
   */
  bulkReviewLines: (batchId: string): string =>
    `${BASE}/batches/${batchId}/lines/review`,

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
