import type {
  LivestockApplicationStatus,
  PaymentProofStatus,
  SubsidyCaseStatus,
} from '@/features/livestock-application/domain/application-types';
import type { InsuranceProviderId } from '@/shared/insurance-providers';
import { isLivestockApplicationStatus } from '@/features/livestock-application/api/mappers/guards';

export function mapPaidStatus(paidStatus?: string): PaymentProofStatus {
  const u = (paidStatus ?? '').toUpperCase();
  if (u === 'VERIFIED' || u === 'PAID') return 'VERIFIED';
  if (u === 'SUBMITTED' || u === 'PENDING_VERIFICATION') return 'SUBMITTED';
  if (u === 'NOT_REQUIRED') return 'NOT_REQUIRED';
  if (u === 'REJECTED') return 'REJECTED';
  return 'PENDING';
}

export function mapLegacyStatus(
  status?: string,
  subsidyStatus?: string,
  paidStatus?: string,
): LivestockApplicationStatus {
  if (status && isLivestockApplicationStatus(status)) return status;

  const s = (status ?? '').toUpperCase();
  const sub = (subsidyStatus ?? '').toUpperCase();
  const paid = (paidStatus ?? '').toUpperCase();

  if (s === 'PENDING') return 'SUBMITTED';
  if (s.includes('ISSUED') || s === 'APPROVED') return 'INSURANCE_ISSUED';
  if (sub.includes('SECTOR') && sub.includes('PENDING')) return 'SUBSIDY_SECTOR_PENDING';
  if (sub.includes('SECTOR') && sub.includes('SIGNED')) return 'SUBSIDY_SECTOR_SIGNED';
  if (paid === 'PENDING' || s.includes('PAYMENT')) return 'PAYMENT_PROOF_REQUIRED';
  if (paid === 'VERIFIED') return 'PAYMENT_VERIFIED';

  return 'SUBMITTED';
}

export function normalizeInsuranceProvider(provider?: string): InsuranceProviderId {
  const p = (provider ?? '').toUpperCase();
  if (p.includes('RADIANT')) return 'RADIANT';
  return 'SONARWA';
}

export function mapSubsidyStatus(subsidyStatus?: string): SubsidyCaseStatus {
  const u = (subsidyStatus ?? '').toUpperCase();
  if (!u || u === 'NOT_REQUIRED' || u === 'NONE') return 'NOT_REQUIRED';
  if (u.includes('SECTOR') && u.includes('PENDING')) return 'SECTOR_PENDING';
  if (u.includes('SECTOR') && u.includes('SIGNED')) return 'SECTOR_SIGNED';
  if (u.includes('VET') && u.includes('SIGNED')) return 'VET_SIGNED';
  if (u.includes('SONARWA') || u.includes('APPROVED')) return 'SONARWA_APPROVED';
  if (u.includes('REJECT')) return 'REJECTED';
  if (u.includes('GENERATED') || u.includes('DOC')) return 'DOC_GENERATED';
  return 'SECTOR_PENDING';
}

export function subsidyRequiredFromStatus(subsidyStatus?: string): boolean {
  const u = (subsidyStatus ?? '').toUpperCase();
  return Boolean(u) && !['NOT_REQUIRED', 'NONE', 'COMPLETED', 'APPROVED'].includes(u);
}

export function computePremiumPercentage(premiumRate: number, sumAssured: number): number {
  if (sumAssured <= 0) return 5.5;
  return Math.round((premiumRate / sumAssured) * 1000) / 10;
}
