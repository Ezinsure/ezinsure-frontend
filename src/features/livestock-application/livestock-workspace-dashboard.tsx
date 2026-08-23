'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Beef,
  Bird,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  Loader2,
  PiggyBank,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import {
  fetchLivestockDashboardStats,
  type LivestockDashboardStats,
} from '@/features/livestock-application/api/dashboard-stats-api';
import type { LivestockListScope } from '@/features/livestock-application/api/livestock-applications.repository';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { useApiClient } from '@/utils/apiClient';

const getFirstDayOfMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

const getTodayDate = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export interface LivestockWorkspaceDashboardProps {
  title: string;
  subtitle: string;
  scope: LivestockListScope;
  /** When true, company commission cards are hidden (vet view). */
  hideCompanyCommission?: boolean;
  /** Limit stats to the signed-in vet. */
  vetScoped?: boolean;
}

export function LivestockWorkspaceDashboard({
  title,
  subtitle,
  scope,
  hideCompanyCommission = false,
  vetScoped = false,
}: LivestockWorkspaceDashboardProps) {
  const { apiFetch } = useApiClient();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(getFirstDayOfMonth);
  const [endDate, setEndDate] = useState(getTodayDate);
  const [stats, setStats] = useState<LivestockDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (vetScoped && !user?._id) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchLivestockDashboardStats(apiFetch, {
        startDate,
        endDate,
        scope,
        vetId: vetScoped ? user?._id : undefined,
        hideCompanyCommission,
      });
      setStats(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard statistics.');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, endDate, hideCompanyCommission, scope, startDate, user?._id, vetScoped]);

  useEffect(() => {
    void load();
  }, [load]);

  const animals = stats?.animalsInsured;

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  Livestock workspace
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">{subtitle}</p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs font-medium text-slate-600">
                  From
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  To
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void load()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>
          </header>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Applications"
              value={(stats?.applicationsCount ?? 0).toLocaleString()}
              caption="In selected period"
              icon={Briefcase}
            />
            <StatCard
              title="Animals insured"
              value={(animals?.total ?? 0).toLocaleString()}
              caption="All species"
              icon={Calendar}
            />
            <StatCard
              title="Total insured value"
              value={formatRwfDisplay(stats?.totalInsuredValue ?? 0)}
              caption="Sum assured"
              icon={Wallet}
            />
            <StatCard
              title={vetScoped ? 'Your commissions' : 'Agent commissions'}
              value={formatRwfDisplay(stats?.totalAgentCommissions ?? 0)}
              caption="Veterinary / agent share"
              icon={DollarSign}
            />
            {!hideCompanyCommission && (
              <StatCard
                title="Company commissions"
                value={formatRwfDisplay(stats?.totalCompanyCommissions ?? 0)}
                caption="Solektra share (5–10%)"
                icon={Building2}
              />
            )}
          </div>

          <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-[var(--main-blue,#1d4ed8)] px-6 py-4 text-white">
              <h2 className="text-lg font-semibold">Animals by type</h2>
              <p className="mt-1 text-sm text-blue-100">
                Totals for cows, pigs, and chickens insured in the selected date range.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
              <AnimalTypeCard label="Cows" value={animals?.cows ?? 0} icon={Beef} />
              <AnimalTypeCard label="Pigs" value={animals?.pigs ?? 0} icon={PiggyBank} />
              <AnimalTypeCard label="Chickens" value={animals?.chickens ?? 0} icon={Bird} />
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}

function StatCard({
  title,
  value,
  caption,
  icon: Icon,
}: {
  title: string;
  value: string;
  caption: string;
  icon: typeof Briefcase;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{caption}</p>
        </div>
        <span className="rounded-xl bg-slate-50 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function AnimalTypeCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Beef;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-6">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-white p-3 text-slate-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
