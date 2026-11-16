import { AlertOctagon, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import { formatMoney } from '@/utils/money';
import { cx } from '../ui/cx';
import { Skeleton } from '../ui/skeleton';
import type { AttentionItem, AttentionSeverity } from './attention';

const SEVERITY: Record<AttentionSeverity, { icon: LucideIcon; iconClass: string; label: string }> = {
  critical: { icon: AlertOctagon, iconClass: 'text-rose-600', label: 'Urgent' },
  warning: { icon: AlertTriangle, iconClass: 'text-amber-600', label: 'Needs attention' },
  info: { icon: Info, iconClass: 'text-sky-600', label: 'To do' },
};

interface AttentionPanelProps {
  items: AttentionItem[] | undefined;
  loading: boolean;
}

/** A short to-do list. Empty means everything is up to date. */
export function AttentionPanel({ items, loading }: AttentionPanelProps) {
  return (
    <section aria-label="Needs your attention" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Needs your attention</h2>

      {loading ? (
        <div className="mt-3 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !items ? (
        <p className="mt-3 text-sm text-slate-500">Not available right now.</p>
      ) : items.length === 0 ? (
        <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
          <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          Everything is up to date for this period.
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {items.map((item) => {
            const { icon: Icon, iconClass, label } = SEVERITY[item.severity];
            return (
              <li key={item.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                <Icon aria-label={label} className={cx('mt-0.5 h-4 w-4 shrink-0', iconClass)} />
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  {item.detail ? <p className="text-slate-500">{item.detail}</p> : null}
                  {item.amount !== undefined ? (
                    <p className="mt-0.5 font-medium tabular-nums text-slate-700">{formatMoney(item.amount)}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
