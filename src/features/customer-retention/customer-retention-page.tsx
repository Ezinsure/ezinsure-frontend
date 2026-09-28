'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  Info,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserRoundCheck,
  Users,
  UserX,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  fetchClientInsuranceStats,
  type ClientInsuranceStats,
} from '@/features/customer-retention/customer-retention-api';
import { useApiClient } from '@/utils/apiClient';

type DatePreset = 'ytd' | 'last6' | 'last12' | 'custom';

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayDate(): string {
  return formatLocalDate(new Date());
}

function getYearToDateStart(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function getMonthsAgoDate(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return formatLocalDate(date);
}

function resolvePresetRange(preset: Exclude<DatePreset, 'custom'>): {
  startDate: string;
  endDate: string;
} {
  const endDate = getTodayDate();
  if (preset === 'ytd') return { startDate: getYearToDateStart(), endDate };
  if (preset === 'last6') return { startDate: getMonthsAgoDate(6), endDate };
  return { startDate: getMonthsAgoDate(12), endDate };
}

const DATE_PRESETS: Array<{ value: Exclude<DatePreset, 'custom'>; label: string }> = [
  { value: 'ytd', label: 'Year to date' },
  { value: 'last6', label: 'Last 6 months' },
  { value: 'last12', label: 'Last 12 months' },
];

function formatPercentage(value: number, total: number): string {
  if (total <= 0) return '0.0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

export default function CustomerRetentionPage() {
  const { apiFetch } = useApiClient();
  const { showToast, ToastContainer } = useToast();

  const [startDate, setStartDate] = useState(getYearToDateStart);
  const [endDate, setEndDate] = useState(getTodayDate);
  const [activePreset, setActivePreset] = useState<DatePreset>('ytd');
  const [data, setData] = useState<ClientInsuranceStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(
    async (rangeStart: string, rangeEnd: string) => {
      if (!rangeStart || !rangeEnd) {
        showToast('Please select both start and end dates', 'error');
        return;
      }
      if (rangeStart > rangeEnd) {
        showToast('Start date must be on or before end date', 'error');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const payload = await fetchClientInsuranceStats(apiFetch, {
          startDate: rangeStart,
          endDate: rangeEnd,
        });
        setData(payload);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load client insurance stats';
        setData(null);
        setError(message);
        showToast(message, 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [apiFetch, showToast],
  );

  useEffect(() => {
    void loadStats(startDate, endDate);
    // Initial load only — subsequent fetches are triggered by Apply / presets / Refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = (preset: Exclude<DatePreset, 'custom'>) => {
    const range = resolvePresetRange(preset);
    setActivePreset(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    void loadStats(range.startDate, range.endDate);
  };

  const handleStartDateChange = (value: string) => {
    setActivePreset('custom');
    setStartDate(value);
  };

  const handleEndDateChange = (value: string) => {
    setActivePreset('custom');
    setEndDate(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--portal-primary-soft)] text-[var(--portal-primary)]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--portal-primary)]">
                Admin · Motor
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Customer retention
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Monitor customer renewal behavior and active motor insurance coverage.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void loadStats(startDate, endDate)}
            disabled={isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </span>
            )}
          </Button>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => {
              const active = activePreset === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => applyPreset(preset.value)}
                  disabled={isLoading}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    active
                      ? 'bg-[var(--portal-primary)] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
                <Calendar className="h-3.5 w-3.5" /> From
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--portal-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary-soft)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={getTodayDate()}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--portal-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--portal-primary-soft)]"
              />
            </div>
            <Button
              type="button"
              variant="primary"
              disabled={isLoading}
              onClick={() => void loadStats(startDate, endDate)}
            >
              Apply
            </Button>
          </div>
        </section>

        {isLoading && !data && !error ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--portal-primary)]" />
              <p className="mt-3 text-sm text-slate-500">Loading retention metrics…</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : data ? (
          <div className={`space-y-6 transition-opacity ${isLoading ? 'opacity-60' : 'opacity-100'}`}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Total clients',
                  value: data.totalClients,
                  helper: 'Clients in the selected period',
                  icon: Users,
                  iconClass: 'bg-blue-50 text-blue-700',
                },
                {
                  label: 'Renewed clients',
                  value: data.renewedAtLeastOnce,
                  helper: `${formatPercentage(data.renewedAtLeastOnce, data.totalClients)} retention rate`,
                  icon: UserRoundCheck,
                  iconClass: 'bg-emerald-50 text-emerald-700',
                },
                {
                  label: 'Ongoing insurance',
                  value: data.ongoingInsurance,
                  helper: `${formatPercentage(data.ongoingInsurance, data.totalClients)} of clients`,
                  icon: ShieldCheck,
                  iconClass: 'bg-indigo-50 text-indigo-700',
                },
                {
                  label: 'Never renewed',
                  value: data.neverRenewed,
                  helper: `${formatPercentage(data.neverRenewed, data.totalClients)} of clients`,
                  icon: UserX,
                  iconClass: 'bg-amber-50 text-amber-700',
                },
              ].map(({ label, value, helper, icon: Icon, iconClass }) => (
                <article
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-600">{label}</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                        {value.toLocaleString()}
                      </p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{helper}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-3">
                <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                  <h2 className="font-semibold text-slate-900">Renewal status</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Renewal history across clients in the selected period
                  </p>
                </div>
                <div className="grid items-center gap-2 p-5 sm:grid-cols-2 sm:p-6">
                  <div className="relative h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Renewed at least once', value: data.renewedAtLeastOnce },
                            { name: 'Never renewed', value: data.neverRenewed },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={62}
                          outerRadius={88}
                          paddingAngle={2}
                        >
                          <Cell fill="#059669" />
                          <Cell fill="#F59E0B" />
                        </Pie>
                        <Tooltip formatter={(value: number) => value.toLocaleString()} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-semibold text-slate-950">
                        {formatPercentage(data.renewedAtLeastOnce, data.totalClients)}
                      </span>
                      <span className="text-xs text-slate-500">retention</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        label: 'Renewed at least once',
                        value: data.renewedAtLeastOnce,
                        color: 'bg-emerald-600',
                      },
                      {
                        label: 'Never renewed',
                        value: data.neverRenewed,
                        color: 'bg-amber-500',
                      },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2 text-slate-600">
                            <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                            {item.label}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {item.value.toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${item.color}`}
                            style={{
                              width: formatPercentage(item.value, data.totalClients),
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[var(--portal-primary)]" />
                  <h2 className="font-semibold text-slate-900">Retention overview</h2>
                </div>
                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Renewal rate
                  </p>
                  <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">
                    {formatPercentage(data.renewedAtLeastOnce, data.totalClients)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {data.renewedAtLeastOnce.toLocaleString()} of{' '}
                    {data.totalClients.toLocaleString()} clients have renewed at least once.
                  </p>
                </div>
                <div className="mt-4 flex gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Ongoing insurance is shown separately because active coverage and renewal
                    history can overlap.
                  </p>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Reporting period: {startDate} to {endDate}
                </p>
              </section>
            </div>
          </div>
        ) : null}
      </div>

      <ToastContainer />
    </div>
  );
}
