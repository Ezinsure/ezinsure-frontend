import {
  EXTERNAL_VET_LINE_STATUS_LABELS,
  type ExternalVetLineStatus,
} from '../domain';

const LINE_TONE: Record<
  ExternalVetLineStatus,
  { wrap: string; dot: string }
> = {
  PENDING_REVIEW: {
    wrap: 'bg-amber-50 text-amber-900 ring-amber-200/80',
    dot: 'bg-amber-500',
  },
  APPROVED: {
    wrap: 'bg-emerald-50 text-emerald-900 ring-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  REJECTED: {
    wrap: 'bg-rose-50 text-rose-900 ring-rose-200/80',
    dot: 'bg-rose-500',
  },
};

export function LineStatusBadge({
  status,
  size = 'sm',
}: {
  status: ExternalVetLineStatus;
  size?: 'sm' | 'md';
}) {
  const tone = LINE_TONE[status];
  const padding = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-1 text-[11px]';

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md font-semibold leading-none tracking-wide ring-1 ring-inset ${padding} ${tone.wrap}`}
      title={EXTERNAL_VET_LINE_STATUS_LABELS[status]}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`}
        aria-hidden
      />
      <span className="truncate whitespace-nowrap">
        {EXTERNAL_VET_LINE_STATUS_LABELS[status]}
      </span>
    </span>
  );
}
