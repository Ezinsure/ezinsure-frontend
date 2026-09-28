'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Clock3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useSonarwaApplicationsList } from '@/features/sonarwa-portal/hooks/use-sonarwa-applications';

function getFirstDayOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function SonarwaLivestockDashboardPage() {
  const { user } = useAuth();
  const { meta: pendingMeta, isLoading: pendingLoading, error: pendingError, load: loadPending } =
    useSonarwaApplicationsList(1);
  const { meta: allMeta, isLoading: allLoading, error: allError, load: loadAll } =
    useSonarwaApplicationsList(1);

  const [startDate] = useState(getFirstDayOfMonth);
  const [endDate] = useState(getTodayDate);

  const refresh = useCallback(() => {
    void loadPending(startDate, endDate, 1, 1, 'pending');
    void loadAll(startDate, endDate, 1, 1, 'all');
  }, [endDate, loadAll, loadPending, startDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isLoading = pendingLoading || allLoading;
  const error = pendingError || allError;
  const awaiting = pendingMeta.total;
  const reviewed = Math.max(0, allMeta.total - pendingMeta.total);

  const cards = [
    {
      label: 'Awaiting review',
      value: awaiting,
      detail: 'Pending SONARWA decision this month',
      icon: Clock3,
      tone: 'bg-[var(--sonarwa-soft)] text-[var(--sonarwa-primary)]',
    },
    {
      label: 'Already reviewed',
      value: reviewed,
      detail: 'At or past SONARWA review this month',
      icon: CheckCircle2,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'In scope',
      value: allMeta.total,
      detail: 'Applications at or past SONARWA stage',
      icon: ClipboardCheck,
      tone: 'bg-blue-50 text-blue-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-[var(--sonarwa-primary)]" />
          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--sonarwa-primary)]">
                SONARWA · Livestock
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Welcome, {user?.fullName || 'Representative'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Review livestock insurance evidence and move verified applications to admin review.
                Counts use the current month by default.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" disabled={isLoading} onClick={refresh}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link
                href="/sonarwa/livestock/applications"
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--sonarwa-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--sonarwa-primary-hover)]"
              >
                Open review queue
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Review summary">
          {cards.map(({ label, value, detail, icon: Icon, tone }) => (
            <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-5 text-sm font-medium text-slate-600">{label}</p>
              <p className="mt-1 text-3xl font-semibold text-slate-950">
                {isLoading ? '—' : value.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-slate-500">{detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Review standard</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Approve clean applications as submitted. When evidence contains errors or fraud risks,
            approve with changes: upload a corrected document, set the veterinary commission that
            should be paid, and leave a clear comment for finance/admin.
          </p>
        </section>
      </div>
    </div>
  );
}
