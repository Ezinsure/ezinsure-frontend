'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Calendar, DollarSign, Loader2, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { VetApplicationDetailsModal } from '@/features/vet-portal/vet-application-details-modal';
import { VetApplicationsTable } from '@/features/vet-portal/vet-applications-table';
import type { VeterinaryApplication } from '@/features/vet-portal/types';
import { useVetApplications } from '@/features/vet-portal/use-vet-applications';
import { formatRwf } from '@/features/vet-portal/utils';

const VET_LIVESTOCK_BASE = '/vet/livestock';

const getFirstDayOfMonth = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
};

const getTodayDate = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function VetDashboardPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(getFirstDayOfMonth);
  const [endDate, setEndDate] = useState(getTodayDate);
  const [selectedApplication, setSelectedApplication] = useState<VeterinaryApplication | null>(null);

  const { applications, isLoading, error, fetchApplications } = useVetApplications(user?._id);

  useEffect(() => {
    void fetchApplications(startDate, endDate);
  }, [fetchApplications, startDate, endDate]);

  const stats = useMemo(() => {
    const totalCommission = applications.reduce(
      (sum, app) => sum + (app.veterinaryCommission || 0),
      0,
    );
    const issuedCount = applications.filter(
      (app) => app.status?.toLowerCase() === 'insurance_issued',
    ).length;
    const pendingCommission = applications.filter((app) =>
      app.agentCommissionPaymentStatus?.toLowerCase().includes('pending'),
    ).length;

    return {
      total: applications.length,
      totalCommission,
      issuedCount,
      pendingCommission,
    };
  }, [applications]);

  const statCards = [
    {
      title: 'Applications',
      value: stats.total.toLocaleString(),
      caption: 'In selected period',
      icon: Briefcase,
      iconClass: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Your commission',
      value: formatRwf(stats.totalCommission),
      caption: 'Veterinary commission total',
      icon: DollarSign,
      iconClass: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Insurance issued',
      value: stats.issuedCount.toLocaleString(),
      caption: 'Policies issued',
      icon: Briefcase,
      iconClass: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Commission pending',
      value: stats.pendingCommission.toLocaleString(),
      caption: 'Awaiting admin review',
      icon: DollarSign,
      iconClass: 'bg-amber-50 text-amber-700',
    },
  ];

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
                <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                  Welcome back, {user?.fullName || 'Veterinarian'}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Review assigned livestock applications, track commission, and open full details for
                  each policy.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link
                  href={`${VET_LIVESTOCK_BASE}/applications/new`}
                  className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
                >
                  New application
                </Link>
                <Link
                  href={`${VET_LIVESTOCK_BASE}/applications`}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  All applications
                </Link>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-4 border-t border-slate-100 pt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Calendar className="h-4 w-4 text-slate-500" />
                Date range
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">From</span>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">To</span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    max={getTodayDate()}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => void fetchApplications(startDate, endDate)}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">Refresh</span>
                </Button>
              </div>
            </div>
          </header>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div
                    className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${card.iconClass}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{card.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{card.caption}</p>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Applications
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Recent livestock policies</h2>
              <p className="mt-1 text-sm text-slate-500">
                Applications assigned to you in the selected date range.
              </p>
            </div>

            <VetApplicationsTable
              applications={applications}
              isLoading={isLoading}
              onViewDetails={setSelectedApplication}
              itemsPerPageDefault={8}
            />
          </section>
        </div>
      </div>

      <VetApplicationDetailsModal
        application={selectedApplication}
        onClose={() => setSelectedApplication(null)}
      />
    </MainLayout>
  );
}
