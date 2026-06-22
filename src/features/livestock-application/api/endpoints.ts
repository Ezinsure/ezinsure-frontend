/**
 * Livestock veterinary API route builders — single source of truth for paths.
 */

export interface ListApplicationsParams {
  agentId: string;
  startDate: string;
  endDate: string;
}

export interface ListAllApplicationsParams {
  startDate: string;
  endDate: string;
}

export const LIVESTOCK_VET_ENDPOINTS = {
  listApplications: ({ agentId, startDate, endDate }: ListApplicationsParams): string => {
    const search = new URLSearchParams({ agentId, startDate, endDate });
    return `/getVeterinaryApplications?${search.toString()}`;
  },

  getApplicationById: (applicationId: string): string =>
    `/getVeterinaryApplication/${encodeURIComponent(applicationId)}`,

  getApplicationByQuery: (applicationId: string): string =>
    `/getVeterinaryApplication?applicationId=${encodeURIComponent(applicationId)}`,

  getApplicationByIdParam: (applicationId: string): string =>
    `/getVeterinaryApplication?id=${encodeURIComponent(applicationId)}`,

  createApplication: (): string => '/newApplication',
} as const;

/** Admin / finance / super admin — all livestock packages in date range. */
export const LIVESTOCK_ADMIN_ENDPOINTS = {
  listAllApplications: ({ startDate, endDate }: ListAllApplicationsParams): string => {
    const search = new URLSearchParams({ startDate, endDate });
    return `/getAllLivestockApplications?${search.toString()}`;
  },
} as const;

/** Wide date range used only when detail endpoint is unavailable. */
export const LIST_FALLBACK_START_DATE = '2000-01-01';
