'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Loader2,
  Minus,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { formatCompareRangeLabel } from './dates';
import {
  computeDelta,
  type PerformanceCompareMetric,
  type PerformanceCompareResult,
} from './types';

type Props = {
  data: PerformanceCompareResult | null;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  /** Shown as a chip: company-wide vs personal book. */
  scopeLabel?: 'Company' | 'Your book';
  /** Optional product line label in the header. */
  channelLabel?: string;
};

type ViewMode = 'charts' | 'numbers';

function formatMetricValue(
  value: number,
  kind: 'count' | 'currency' | 'number',
): string {
  if (kind === 'currency') return formatRwfDisplay(value);
  return value.toLocaleString();
}

function pickHeroMetric(
  metrics: PerformanceCompareMetric[],
): PerformanceCompareMetric | null {
  if (!metrics.length) return null;
  const preferred = [
    'sonarwaBilling',
    'companyCommission',
    'insuredValue',
    'commission',
    'agentCommission',
    'applications',
  ];
  for (const id of preferred) {
    const hit = metrics.find((m) => m.id === id);
    if (hit) return hit;
  }
  return metrics[0] ?? null;
}

function PairedBars({
  metric,
  todayLabel,
  previousLabel,
}: {
  metric: PerformanceCompareMetric;
  todayLabel: string;
  previousLabel: string;
}) {
  const max = Math.max(metric.current, metric.previous, 1);
  const todayPct = Math.round((metric.current / max) * 100);
  const prevPct = Math.round((metric.previous / max) * 100);
  const delta = computeDelta(metric.current, metric.previous);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {metric.label}
        </p>
        <span
          className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
            delta.direction === 'up'
              ? 'bg-emerald-50 text-emerald-700'
              : delta.direction === 'down'
                ? 'bg-rose-50 text-rose-700'
                : 'bg-slate-100 text-slate-600'
          }`}
        >
          {delta.direction === 'up' ? (
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          ) : delta.direction === 'down' ? (
            <ArrowDownRight className="h-3 w-3" aria-hidden />
          ) : (
            <Minus className="h-3 w-3" aria-hidden />
          )}
          {delta.percent == null
            ? delta.absolute === 0
              ? 'Flat'
              : formatMetricValue(Math.abs(delta.absolute), metric.kind)
            : `${delta.percent > 0 ? '+' : ''}${delta.percent.toFixed(0)}%`}
        </span>
      </div>

      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
        {formatMetricValue(metric.current, metric.kind)}
      </p>

      <div className="mt-4 space-y-2.5" role="img" aria-label={`${metric.label} comparison`}>
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-medium text-slate-700">{todayLabel}</span>
            <span>{formatMetricValue(metric.current, metric.kind)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-[width] duration-700 ease-out"
              style={{ width: `${todayPct}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-medium text-slate-600">{previousLabel}</span>
            <span>{formatMetricValue(metric.previous, metric.kind)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-400 transition-[width] duration-700 ease-out"
              style={{ width: `${prevPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupedCompareChart({
  metrics,
  todayLabel,
  previousLabel,
  kind,
}: {
  metrics: PerformanceCompareMetric[];
  todayLabel: string;
  previousLabel: string;
  kind: 'count' | 'currency';
}) {
  const rows = metrics.filter((m) => m.kind === kind);
  if (!rows.length) return null;

  const chartData = rows.map((m) => ({
    name: m.label,
    today: m.current,
    lastMonth: m.previous,
  }));

  const isCurrency = kind === 'currency';

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">
          {isCurrency ? 'Money side by side' : 'Volume side by side'}
        </h3>
        <p className="text-[11px] text-slate-500">
          {isCurrency ? 'RWF' : 'Counts'} · MTD vs prior MTD
        </p>
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#64748B', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                isCurrency
                  ? v >= 1000
                    ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`
                    : String(v)
                  : String(v)
              }
            />
            <YAxis
              type="category"
              dataKey="name"
              width={108}
              tick={{ fill: '#475569', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.98)',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [
                isCurrency ? formatRwfDisplay(value) : value.toLocaleString(),
                name === 'today' ? todayLabel : previousLabel,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) =>
                value === 'today' ? todayLabel : previousLabel
              }
            />
            <Bar
              dataKey="today"
              name="today"
              fill="#2563EB"
              radius={[0, 6, 6, 0]}
              barSize={12}
            />
            <Bar
              dataKey="lastMonth"
              name="lastMonth"
              fill="#94A3B8"
              radius={[0, 6, 6, 0]}
              barSize={12}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Shared month-to-date vs prior-month MTD pulse — hero + paired bars + charts.
 */
export function PerformanceCompareCards({
  data,
  isLoading,
  error,
  className = '',
  scopeLabel,
  channelLabel,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('charts');

  const hero = useMemo(
    () => (data?.metrics?.length ? pickHeroMetric(data.metrics) : null),
    [data?.metrics],
  );

  const supporting = useMemo(() => {
    if (!data?.metrics?.length || !hero) return data?.metrics ?? [];
    return data.metrics.filter((m) => m.id !== hero.id);
  }, [data?.metrics, hero]);

  const todayShort = data
    ? formatCompareRangeLabel(data.currentStart, data.asOf)
    : 'This MTD';
  const prevShort = data
    ? formatCompareRangeLabel(data.previousStart, data.previousAsOf)
    : 'Prior MTD';

  if (isLoading && !data) {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-12 text-sm text-slate-500 ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading performance pulse…
      </div>
    );
  }

  if (error && !data?.metrics.length) {
    return (
      <div
        className={`rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 ${className}`}
      >
        Could not load MTD compare: {error}
      </div>
    );
  }

  if (!data?.metrics.length || !hero) return null;

  const heroDelta = computeDelta(hero.current, hero.previous);
  const HeroIcon =
    heroDelta.direction === 'up'
      ? ArrowUpRight
      : heroDelta.direction === 'down'
        ? ArrowDownRight
        : Minus;
  const heroTone =
    heroDelta.direction === 'up'
      ? 'border-emerald-200 from-emerald-50/80 to-white'
      : heroDelta.direction === 'down'
        ? 'border-rose-200 from-rose-50/60 to-white'
        : 'border-slate-200 from-slate-50 to-white';

  const resolvedScope =
    scopeLabel ??
    (data.audience === 'admin' ? 'Company' : 'Your book');

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Performance pulse
              </h2>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {resolvedScope}
              </span>
              {channelLabel ? (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  {channelLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Month to date vs same period last month ·{' '}
              <span className="font-medium text-slate-800">{todayShort}</span>
              {' · '}
              <span className="text-slate-500">{prevShort}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!data.fromApi ? (
              <p className="text-xs text-slate-400">Computed from period stats</p>
            ) : null}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('charts')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  viewMode === 'charts'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Charts
              </button>
              <button
                type="button"
                onClick={() => setViewMode('numbers')}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  viewMode === 'numbers'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Numbers
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <div
          className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 sm:p-6 ${heroTone}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {hero.label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {formatMetricValue(hero.current, hero.kind)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${
                heroDelta.direction === 'up'
                  ? 'bg-emerald-100 text-emerald-800'
                  : heroDelta.direction === 'down'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-200 text-slate-700'
              }`}
            >
              <HeroIcon className="h-4 w-4" aria-hidden />
              {heroDelta.percent == null
                ? heroDelta.absolute === 0
                  ? 'No change'
                  : formatMetricValue(Math.abs(heroDelta.absolute), hero.kind)
                : `${heroDelta.percent > 0 ? '+' : ''}${heroDelta.percent.toFixed(0)}%`}
            </span>
            <span className="text-xs text-slate-500">vs prior month MTD</span>
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Prior period ({prevShort}):{' '}
            <span className="font-semibold text-slate-800">
              {formatMetricValue(hero.previous, hero.kind)}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(supporting.length ? supporting : data.metrics)
            .slice(0, 4)
            .map((metric) =>
              viewMode === 'charts' ? (
                <PairedBars
                  key={metric.id}
                  metric={metric}
                  todayLabel={todayShort}
                  previousLabel={prevShort}
                />
              ) : (
                <div
                  key={metric.id}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">
                    {formatMetricValue(metric.current, metric.kind)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Prior MTD: {formatMetricValue(metric.previous, metric.kind)}
                  </p>
                </div>
              ),
            )}
        </div>
      </div>

      {viewMode === 'charts' ? (
        <div className="grid gap-4 border-t border-slate-100 px-5 py-5 sm:px-6 sm:grid-cols-1 xl:grid-cols-2">
          <GroupedCompareChart
            metrics={data.metrics}
            todayLabel={todayShort}
            previousLabel={prevShort}
            kind="count"
          />
          <GroupedCompareChart
            metrics={data.metrics}
            todayLabel={todayShort}
            previousLabel={prevShort}
            kind="currency"
          />
        </div>
      ) : null}
    </section>
  );
}
