'use client';

import {
  ClipboardCheck,
  Eye,
  Pencil,
  UserCheck,
  UserX,
  type LucideIcon,
} from 'lucide-react';

interface ActionButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: 'neutral' | 'danger' | 'success' | 'primary';
}

const TONE_CLASSES = {
  neutral: 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900',
  danger: 'border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700',
  success:
    'border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700',
  primary:
    'border-blue-200 text-[var(--portal-primary)] hover:border-[var(--portal-primary)] hover:bg-[var(--portal-primary-soft)]',
} as const;

function ActionButton({
  label,
  icon: Icon,
  onClick,
  tone = 'neutral',
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-primary)] focus-visible:ring-offset-2 ${TONE_CLASSES[tone]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}

interface UserTableActionsProps {
  status: 'ACTIVE' | 'DEACTIVATED' | 'SENT_FOR_ACTION' | 'PENDING';
  onView: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onReview: () => void;
  onActivate: () => void;
  /** When false, only View is shown (e.g. non-creatable livestock roles). */
  canManage?: boolean;
}

export function UserTableActions({
  status,
  onView,
  onEdit,
  onDeactivate,
  onReview,
  onActivate,
  canManage = true,
}: UserTableActionsProps) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
      <ActionButton label="View user" icon={Eye} onClick={onView} />

      {canManage && status === 'ACTIVE' && (
        <>
          <ActionButton label="Edit user" icon={Pencil} onClick={onEdit} />
          <ActionButton
            label="Deactivate user"
            icon={UserX}
            onClick={onDeactivate}
            tone="danger"
          />
        </>
      )}

      {canManage && (status === 'PENDING' || status === 'SENT_FOR_ACTION') && (
        <ActionButton
          label="Review user"
          icon={ClipboardCheck}
          onClick={onReview}
          tone="primary"
        />
      )}

      {canManage && status === 'DEACTIVATED' && (
        <ActionButton
          label="Activate user"
          icon={UserCheck}
          onClick={onActivate}
          tone="success"
        />
      )}
    </div>
  );
}
