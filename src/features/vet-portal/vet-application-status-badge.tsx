import { formatStatusLabel } from '@/features/vet-portal/utils';

const STATUS_STYLES: Record<string, string> = {
  insurance_issued: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  pending: 'bg-blue-50 text-blue-800 ring-blue-200',
  application_approved: 'bg-green-50 text-green-800 ring-green-200',
  waiting_for_user_action: 'bg-orange-50 text-orange-800 ring-orange-200',
  cancelled: 'bg-slate-100 text-slate-700 ring-slate-200',
  pending_admin_review: 'bg-amber-50 text-amber-900 ring-amber-200',
};

function resolveStyle(status: string): string {
  const key = status.toLowerCase();
  if (STATUS_STYLES[key]) return STATUS_STYLES[key];
  if (key.includes('pending')) return STATUS_STYLES.pending_admin_review;
  if (key.includes('issued')) return STATUS_STYLES.insurance_issued;
  return 'bg-slate-50 text-slate-700 ring-slate-200';
}

export function VetApplicationStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex max-w-[12rem] items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${resolveStyle(status)}`}
    >
      <span className="truncate">{formatStatusLabel(status)}</span>
    </span>
  );
}
