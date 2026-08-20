import {
  EXTERNAL_VET_STATUS_LABELS,
  type ExternalVetCommissionStatus,
} from '../domain';

const STATUS_CLASS: Record<ExternalVetCommissionStatus, string> = {
  PENDING_ADMIN_REVIEW: 'bg-amber-50 text-amber-800 border-amber-200',
  READY_TO_BE_PAID: 'bg-sky-50 text-sky-800 border-sky-200',
  PAYMENT_INITIATED: 'bg-violet-50 text-violet-800 border-violet-200',
  PAID: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
};

export function ExternalVetStatusBadge({
  status,
}: {
  status: ExternalVetCommissionStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {EXTERNAL_VET_STATUS_LABELS[status]}
    </span>
  );
}
