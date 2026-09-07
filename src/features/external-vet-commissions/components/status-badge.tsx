import {
  EXTERNAL_VET_STATUS_LABELS,
  type ExternalVetCommissionStatus,
} from '../domain';

type StatusTone = {
  wrap: string;
  dot: string;
};

/**
 * Compact status chip used across the external-vets workspace.
 * Dot + single-line label reads cleaner than a large pill that wraps mid-phrase.
 */
const STATUS_TONE: Record<ExternalVetCommissionStatus, StatusTone> = {
  PENDING_ADMIN_REVIEW: {
    wrap: 'bg-amber-50 text-amber-900 ring-amber-200/80',
    dot: 'bg-amber-500',
  },
  READY_TO_BE_PAID: {
    wrap: 'bg-sky-50 text-sky-900 ring-sky-200/80',
    dot: 'bg-sky-500',
  },
  PAYMENT_INITIATED: {
    wrap: 'bg-violet-50 text-violet-900 ring-violet-200/80',
    dot: 'bg-violet-500',
  },
  PAID: {
    wrap: 'bg-emerald-50 text-emerald-900 ring-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  AWAITING_SONARWA_REIMBURSEMENT: {
    wrap: 'bg-orange-50 text-orange-950 ring-orange-200/80',
    dot: 'bg-orange-500',
  },
  REIMBURSED_BY_SONARWA: {
    wrap: 'bg-teal-50 text-teal-950 ring-teal-200/80',
    dot: 'bg-teal-500',
  },
  REJECTED: {
    wrap: 'bg-rose-50 text-rose-900 ring-rose-200/80',
    dot: 'bg-rose-500',
  },
};

export function ExternalVetStatusBadge({
  status,
}: {
  status: ExternalVetCommissionStatus;
}) {
  const tone = STATUS_TONE[status];

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold leading-none tracking-wide ring-1 ring-inset ${tone.wrap}`}
      title={EXTERNAL_VET_STATUS_LABELS[status]}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`}
        aria-hidden
      />
      <span className="truncate whitespace-nowrap">
        {EXTERNAL_VET_STATUS_LABELS[status]}
      </span>
    </span>
  );
}
