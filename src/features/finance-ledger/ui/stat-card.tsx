import type { ReactNode } from 'react';
import { cx } from './cx';
import { Skeleton } from './skeleton';

type StatTone = 'neutral' | 'good' | 'warning' | 'bad';

const VALUE_TONES: Record<StatTone, string> = {
  neutral: 'text-slate-900',
  good: 'text-emerald-700',
  warning: 'text-amber-700',
  bad: 'text-rose-700',
};

interface StatCardProps {
  label: string;
  /** Already formatted, e.g. `formatMoney(total)`. */
  value: ReactNode;
  /** One short line of context under the value. */
  hint?: ReactNode;
  tone?: StatTone;
  loading?: boolean;
  /** Makes the whole card a button, e.g. to jump to the matching list. */
  onClick?: () => void;
  className?: string;
}

/** A single headline number with a label. */
export function StatCard({ label, value, hint, tone = 'neutral', loading, onClick, className }: StatCardProps) {
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-32" />
      ) : (
        <p className={cx('mt-1 text-2xl font-semibold tabular-nums tracking-tight', VALUE_TONES[tone])}>
          {value}
        </p>
      )}
      {hint ? (
        loading ? <Skeleton className="mt-2 h-3.5 w-24" /> : <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </>
  );
  const base = 'rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm';

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cx(base, 'cursor-pointer transition hover:border-slate-300 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400', className)}
    >
      {body}
    </button>
  ) : (
    <div className={cx(base, className)}>{body}</div>
  );
}
