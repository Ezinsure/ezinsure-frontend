export const COMPANY_COMMISSION_DEFAULTS_ENDPOINTS = {
  /**
   * Org defaults for company commission % of net premium.
   * GET — any authenticated admin/creator that needs the rate to prefill.
   * PUT — SUPER_ADMIN only.
   */
  root: (): string => `/configurations/companyCommissionDefaults`,
} as const;
