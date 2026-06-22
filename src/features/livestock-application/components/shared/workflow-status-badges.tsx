'use client';

const PAYMENT_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200/80',
  SUBMITTED: 'bg-blue-50 text-blue-800 ring-blue-200/80',
  VERIFIED: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80',
  REJECTED: 'bg-red-50 text-red-800 ring-red-200/80',
  NOT_REQUIRED: 'bg-slate-50 text-slate-600 ring-slate-200/80',
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: 'Payment pending',
  SUBMITTED: 'Proof submitted',
  VERIFIED: 'Payment verified',
  REJECTED: 'Payment rejected',
  NOT_REQUIRED: 'Not required',
};

interface PaymentStatusBadgeProps {
  status?: string;
  className?: string;
}

export function PaymentStatusBadge({ status, className = '' }: PaymentStatusBadgeProps) {
  const key = (status ?? 'PENDING').toUpperCase();
  const styles = PAYMENT_STYLES[key] ?? PAYMENT_STYLES.PENDING;
  const label = PAYMENT_LABELS[key] ?? key.replace(/_/g, ' ').toLowerCase();

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles} ${className}`}
    >
      {label}
    </span>
  );
}

const SUBSIDY_STYLES: Record<string, string> = {
  NOT_REQUIRED: 'bg-slate-50 text-slate-600 ring-slate-200/80',
  DOC_GENERATED: 'bg-violet-50 text-violet-800 ring-violet-200/80',
  SECTOR_PENDING: 'bg-amber-50 text-amber-800 ring-amber-200/80',
  SECTOR_SIGNED: 'bg-blue-50 text-blue-800 ring-blue-200/80',
  VET_SIGNED: 'bg-indigo-50 text-indigo-800 ring-indigo-200/80',
  SONARWA_APPROVED: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80',
  REJECTED: 'bg-red-50 text-red-800 ring-red-200/80',
};

const SUBSIDY_LABELS: Record<string, string> = {
  NOT_REQUIRED: 'Nkunganire N/A',
  DOC_GENERATED: 'Doc generated',
  SECTOR_PENDING: 'Sector pending',
  SECTOR_SIGNED: 'Sector signed',
  VET_SIGNED: 'Vet signed',
  SONARWA_APPROVED: 'SONARWA approved',
  REJECTED: 'Subsidy rejected',
};

interface SubsidyStatusBadgeProps {
  status?: string;
  className?: string;
}

export function SubsidyStatusBadge({ status, className = '' }: SubsidyStatusBadgeProps) {
  const key = (status ?? 'NOT_REQUIRED').toUpperCase();
  const styles = SUBSIDY_STYLES[key] ?? SUBSIDY_STYLES.NOT_REQUIRED;
  const label = SUBSIDY_LABELS[key] ?? key.replace(/_/g, ' ').toLowerCase();

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles} ${className}`}
    >
      {label}
    </span>
  );
}
