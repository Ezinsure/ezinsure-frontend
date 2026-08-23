/**
 * Configurable Solektra (company) commission rates for livestock applications.
 * Default is 8%; admins may set 5%, 8%, or 10% per application or per vet.
 */

export const COMPANY_COMMISSION_RATE_OPTIONS = [5, 8, 10] as const;

export type CompanyCommissionRatePercent =
  (typeof COMPANY_COMMISSION_RATE_OPTIONS)[number];

/** Default company commission share of total premium (100%). */
export const DEFAULT_COMPANY_COMMISSION_RATE_PERCENT: CompanyCommissionRatePercent = 8;

/** Veterinary commission remains fixed at 5% of total premium. */
export const VETERINARY_COMMISSION_RATE_PERCENT = 5;

export const COMPANY_COMMISSION_RATE_SELECT_OPTIONS: {
  value: CompanyCommissionRatePercent;
  label: string;
}[] = COMPANY_COMMISSION_RATE_OPTIONS.map((rate) => ({
  value: rate,
  label: `${rate}%`,
}));

export function isCompanyCommissionRatePercent(
  value: unknown,
): value is CompanyCommissionRatePercent {
  const n = Number(value);
  return COMPANY_COMMISSION_RATE_OPTIONS.includes(n as CompanyCommissionRatePercent);
}

/** Normalize API / form values to an allowed rate; falls back to 8%. */
export function normalizeCompanyCommissionRatePercent(
  value: unknown,
): CompanyCommissionRatePercent {
  const n = Number(value);
  if (isCompanyCommissionRatePercent(n)) return n;
  return DEFAULT_COMPANY_COMMISSION_RATE_PERCENT;
}

export function companyCommissionRateToFraction(
  percent: CompanyCommissionRatePercent | number,
): number {
  return normalizeCompanyCommissionRatePercent(percent) / 100;
}

export function formatCompanyCommissionRateLabel(
  percent: CompanyCommissionRatePercent | number | undefined | null,
): string {
  const rate = normalizeCompanyCommissionRatePercent(percent);
  return `Komisiyo ya kampani (${rate}%)`;
}

export function formatCompanyCommissionRateCaption(
  percent: CompanyCommissionRatePercent | number | undefined | null,
): string {
  const rate = normalizeCompanyCommissionRatePercent(percent);
  return `Solektra share (${rate}%)`;
}
