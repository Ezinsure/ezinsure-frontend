import type { LivestockApplicationStatus, SubsidyCaseStatus } from '@/features/livestock-application/domain/application-types';

export const APPLICATION_STATUS_LABELS: Record<LivestockApplicationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  PAYMENT_PROOF_REQUIRED: 'Payment proof required',
  PAYMENT_PROOF_SUBMITTED: 'Payment proof submitted',
  PAYMENT_VERIFIED: 'Payment verified',
  SUBSIDY_DOC_REQUIRED: 'Nkunganire document required',
  SUBSIDY_SECTOR_PENDING: 'Awaiting sector signature',
  SUBSIDY_SECTOR_SIGNED: 'Sector signed',
  SUBSIDY_VET_SIGNED: 'Vet signed',
  SUBSIDY_SONARWA_APPROVED: 'SONARWA approved',
  PENDING_COMMISSION_REVIEW: 'Pending commission review',
  COMMISSION_APPROVED: 'Commission approved',
  INSURANCE_ISSUED: 'Insurance issued',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

export const APPLICATION_STATUS_COLORS: Record<
  LivestockApplicationStatus,
  { bg: string; text: string; ring: string }
> = {
  DRAFT: { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-200' },
  SUBMITTED: { bg: 'bg-blue-50', text: 'text-blue-800', ring: 'ring-blue-200' },
  PAYMENT_PROOF_REQUIRED: { bg: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-200' },
  PAYMENT_PROOF_SUBMITTED: { bg: 'bg-amber-50', text: 'text-amber-900', ring: 'ring-amber-300' },
  PAYMENT_VERIFIED: { bg: 'bg-emerald-50', text: 'text-emerald-800', ring: 'ring-emerald-200' },
  SUBSIDY_DOC_REQUIRED: { bg: 'bg-violet-50', text: 'text-violet-800', ring: 'ring-violet-200' },
  SUBSIDY_SECTOR_PENDING: { bg: 'bg-violet-50', text: 'text-violet-900', ring: 'ring-violet-300' },
  SUBSIDY_SECTOR_SIGNED: { bg: 'bg-indigo-50', text: 'text-indigo-800', ring: 'ring-indigo-200' },
  SUBSIDY_VET_SIGNED: { bg: 'bg-indigo-50', text: 'text-indigo-900', ring: 'ring-indigo-300' },
  SUBSIDY_SONARWA_APPROVED: { bg: 'bg-teal-50', text: 'text-teal-800', ring: 'ring-teal-200' },
  PENDING_COMMISSION_REVIEW: { bg: 'bg-orange-50', text: 'text-orange-800', ring: 'ring-orange-200' },
  COMMISSION_APPROVED: { bg: 'bg-green-50', text: 'text-green-800', ring: 'ring-green-200' },
  INSURANCE_ISSUED: { bg: 'bg-emerald-100', text: 'text-emerald-900', ring: 'ring-emerald-300' },
  CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-500', ring: 'ring-slate-200' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-800', ring: 'ring-red-200' },
};

export const SUBSIDY_STATUS_LABELS: Record<SubsidyCaseStatus, string> = {
  NOT_REQUIRED: 'Not required',
  DOC_GENERATED: 'Document generated',
  SECTOR_PENDING: 'Sector pending',
  SECTOR_SIGNED: 'Sector signed',
  VET_SIGNED: 'Vet signed',
  SONARWA_APPROVED: 'SONARWA approved',
  REJECTED: 'Rejected',
};

export const STATUS_TIMELINE_ORDER: LivestockApplicationStatus[] = [
  'SUBMITTED',
  'PAYMENT_PROOF_REQUIRED',
  'PAYMENT_VERIFIED',
  'SUBSIDY_DOC_REQUIRED',
  'SUBSIDY_SECTOR_SIGNED',
  'SUBSIDY_SONARWA_APPROVED',
  'PENDING_COMMISSION_REVIEW',
  'INSURANCE_ISSUED',
];
