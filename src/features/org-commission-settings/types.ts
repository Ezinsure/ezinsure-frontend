/**
 * Org-level default commission rates (livestock company, livestock vet, motor).
 * Backend: GET/PUT /configurations/companyCommissionDefaults
 */

export type CompanyCommissionDefaults = {
  livestockCompanyCommissionPercent: number;
  /** Veterinary payout % of total premium on livestock applications. */
  livestockVeterinaryCommissionPercent: number;
  motorCompanyCommissionPercent: number;
  updatedAt?: string;
  updatedById?: string;
};

/** Local fallbacks when the settings API is not yet available. */
export const FALLBACK_LIVESTOCK_COMPANY_COMMISSION_PERCENT = 3.5;
export const FALLBACK_LIVESTOCK_VETERINARY_COMMISSION_PERCENT = 10;
export const FALLBACK_MOTOR_COMPANY_COMMISSION_PERCENT = 8;

export function clampCommissionPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function parseCommissionPercentInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return clampCommissionPercent(n);
}
