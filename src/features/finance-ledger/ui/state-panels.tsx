import { AlertCircle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from './cx';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Shown when a list has no rows. Say what to do next, not just "No data". */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col items-center px-4 py-12 text-center', className)}>
      <Inbox aria-hidden className="h-8 w-8 text-slate-300" />
      <p className="mt-3 text-sm font-medium text-slate-800">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

/** Shown when loading failed. Always offers a retry. */
export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cx('flex flex-col items-center px-4 py-12 text-center', className)}>
      <AlertCircle aria-hidden className="h-8 w-8 text-rose-400" />
      <p className="mt-3 text-sm font-medium text-slate-800">We couldn&apos;t load this</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
