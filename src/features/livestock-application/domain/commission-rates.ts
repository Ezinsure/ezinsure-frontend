/**
 * Configurable Solektra (company) commission rates for livestock applications.
 * Default is 8%; admins may set 5%, 8%, or 10% per application or per vet.
 */

export const COMPANY_COMMISSION_RATE_OPTIONS = [5, 8, 10] as const;

export type CompanyCommissionRatePercent =
  (typeof COMPANY_COMMISSION_RATE_OPTIONS)[number];

/** Default company commission share of total premium (100%). */
export const DEFAULT_COMPANY_COMMISSION_RATE_PERCENT: CompanyCommissionRatePercent = 8;

/**
 * Default veterinary commission % of total premium.
 * Prefer org setting `livestockVeterinaryCommissionPercent` when available.
 */
export const VETERINARY_COMMISSION_RATE_PERCENT = 10;

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

/** Clamp veterinary commission % (0–100); falls back to org/code default 10%. */
export function normalizeVeterinaryCommissionRatePercent(
  value: unknown,
  fallback: number = VETERINARY_COMMISSION_RATE_PERCENT,
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

export function veterinaryCommissionRateToFraction(
  percent: number = VETERINARY_COMMISSION_RATE_PERCENT,
): number {
  return normalizeVeterinaryCommissionRatePercent(percent) / 100;
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
