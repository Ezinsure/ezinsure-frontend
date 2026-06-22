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

  getApplicationById: (applicationId: string): string =>
    `/getVeterinaryApplication/${encodeURIComponent(applicationId)}`,

  getApplicationByQuery: (applicationId: string): string =>
    `/getVeterinaryApplication?applicationId=${encodeURIComponent(applicationId)}`,

  getApplicationByIdParam: (applicationId: string): string =>
    `/getVeterinaryApplication?id=${encodeURIComponent(applicationId)}`,

  createApplication: (): string => '/newApplication',
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
} as const;

/** Wide date range used only when detail endpoint is unavailable. */
export const LIST_FALLBACK_START_DATE = '2000-01-01';

/** Large page size for scanning list when resolving a single application by id. */
export const LIST_FALLBACK_PAGE_SIZE = 500;
