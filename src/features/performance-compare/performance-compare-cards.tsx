'use client';

import { ArrowDownRight, ArrowUpRight, Loader2, Minus } from 'lucide-react';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { formatCompareDayLabel } from './dates';
import { computeDelta, type PerformanceCompareResult } from './types';

type Props = {
  data: PerformanceCompareResult | null;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
};

function formatMetricValue(
  value: number,
  kind: 'count' | 'currency' | 'number',
): string {
  if (kind === 'currency') return formatRwfDisplay(value);
  return value.toLocaleString();
}

export function PerformanceCompareCards({
  data,
  isLoading,
  error,
  className = '',
}: Props) {
  if (isLoading && !data) {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-10 text-sm text-slate-500 ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading today vs last month…
      </div>
    );
  }

  if (error && !data?.metrics.length) {
    return (
      <div
        className={`rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 ${className}`}
      >
        Could not load day-over-day compare: {error}
      </div>
    );
  }

  if (!data?.metrics.length) return null;

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Today vs same day last month
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Comparing {formatCompareDayLabel(data.asOf)} with{' '}
              {formatCompareDayLabel(data.previousAsOf)}.
            </p>
          </div>
          {!data.fromApi ? (
            <p className="text-xs text-slate-400">
              Computed from daily stats
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-3">
        {data.metrics.map((metric) => {
          const delta = computeDelta(metric.current, metric.previous);
          const DeltaIcon =
            delta.direction === 'up'
              ? ArrowUpRight
              : delta.direction === 'down'
                ? ArrowDownRight
                : Minus;
          const deltaTone =
            delta.direction === 'up'
              ? 'text-emerald-700 bg-emerald-50'
              : delta.direction === 'down'
                ? 'text-rose-700 bg-rose-50'
                : 'text-slate-600 bg-slate-100';

          return (
            <div
              key={metric.id}
              className="bg-white px-5 py-4 sm:px-6 sm:py-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {metric.label}
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <p className="text-2xl font-semibold tracking-tight text-slate-900">
                  {formatMetricValue(metric.current, metric.kind)}
                </p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${deltaTone}`}
                >
                  <DeltaIcon className="h-3.5 w-3.5" aria-hidden />
                  {delta.percent == null
                    ? delta.absolute === 0
                      ? 'No change'
                      : formatMetricValue(Math.abs(delta.absolute), metric.kind)
                    : `${delta.percent > 0 ? '+' : ''}${delta.percent.toFixed(0)}%`}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Last month this day:{' '}
                <span className="font-medium text-slate-700">
                  {formatMetricValue(metric.previous, metric.kind)}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
