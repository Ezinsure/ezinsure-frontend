/**
 * Livestock veterinary API route builders — single source of truth for paths.
 */

export interface PaginatedListApplicationsParams {
  agentId?: string;
  startDate: string;
  endDate: string;
  pageSize: number;
  pageNumber: number;
}

export type PaginatedAdminListParams = Omit<PaginatedListApplicationsParams, 'agentId'>;

export const LIVESTOCK_LIST_DEFAULT_PAGE_SIZE = 25;

export const LIVESTOCK_VET_ENDPOINTS = {
  listApplications: ({
    agentId,
    startDate,
    endDate,
    pageSize,
    pageNumber,
  }: PaginatedListApplicationsParams): string => {
    const search = new URLSearchParams({
      startDate,
      endDate,
      pageSize: String(pageSize),
      pageNumber: String(pageNumber),
    });
    if (agentId) search.set('agentId', agentId);
    return `/getVeterinaryApplications?${search.toString()}`;
  },

  uploadProofOfPayment: (applicationId: string): string =>
    `/uploadProofOfPayment/${encodeURIComponent(applicationId)}`,

  /** GET — full application detail (preferred). */
  getVeterinaryApplicationById: (applicationId: string): string =>
    `/getVeterinaryApplicationById/${encodeURIComponent(applicationId)}`,

  getApplicationById: (applicationId: string): string =>
    `/getVeterinaryApplication/${encodeURIComponent(applicationId)}`,

  getApplicationByQuery: (applicationId: string): string =>
    `/getVeterinaryApplication?applicationId=${encodeURIComponent(applicationId)}`,

  getApplicationByIdParam: (applicationId: string): string =>
    `/getVeterinaryApplication?id=${encodeURIComponent(applicationId)}`,

  createApplication: (): string => '/newApplication',

  verifyPayment: (applicationId: string): string =>
    `/verifyPayment/${encodeURIComponent(applicationId)}`,
} as const;

/** Admin / finance / super admin — all vet applications in date range. */
export const LIVESTOCK_ADMIN_ENDPOINTS = {
  listAllApplications: ({
    startDate,
    endDate,
    pageSize,
    pageNumber,
  }: PaginatedAdminListParams): string => {
    const search = new URLSearchParams({
      startDate,
      endDate,
      pageSize: String(pageSize),
      pageNumber: String(pageNumber),
    });
    return `/getAllApplications?${search.toString()}`;
  },

  /** PUT multipart — issue livestock policy documents after payment verified. */
  issueInsurance: (applicationId: string): string =>
    `/issueLivestockInsurance/${encodeURIComponent(applicationId)}`,

  /** POST — verify payment proof (approve/reject). Alias of vet verify when scoped to admin. */
  verifyPaymentProof: (applicationId: string): string =>
    `/verifyLivestockPayment/${encodeURIComponent(applicationId)}`,

  /** POST — approve or reject signed nkunganire on behalf of SONARWA. */
  reviewSonarwaSubsidy: (applicationId: string): string =>
    `/reviewLivestockSubsidySonarwa/${encodeURIComponent(applicationId)}`,

  /** PUT — move application to ready-to-be-paid after commission review. */
  approveCommission: (applicationId: string): string =>
    `/approveLivestockCommission/${encodeURIComponent(applicationId)}`,

  /** PUT — mark veterinary commission as paid. */
  markCommissionPaid: (applicationId: string): string =>
    `/markLivestockCommissionPaid/${encodeURIComponent(applicationId)}`,
} as const;

/** Nkunganire / sector subsidy workflow (vet-facing). */
export const LIVESTOCK_SUBSIDY_ENDPOINTS = {
  /** POST — generate nkunganire Excel/PDF template. */
  generateDocument: (applicationId: string): string =>
    `/generateLivestockSubsidyDocument/${encodeURIComponent(applicationId)}`,

  /** GET — download animal list for sector signing (Excel). */
  downloadAnimalList: (applicationId: string): string =>
    `/downloadLivestockSubsidyAnimalList/${encodeURIComponent(applicationId)}`,

  /** PUT multipart — upload sector-signed nkunganire scan. */
  uploadSignedDocument: (applicationId: string): string =>
    `/uploadLivestockSignedSubsidy/${encodeURIComponent(applicationId)}`,
} as const;

/** Wide date range used only when detail endpoint is unavailable. */
export const LIST_FALLBACK_START_DATE = '2000-01-01';

/** Large page size for scanning list when resolving a single application by id. */
export const LIST_FALLBACK_PAGE_SIZE = 500;
