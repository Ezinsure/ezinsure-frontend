'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApplicationsListTable } from '@/features/livestock-application/components/applications-list/applications-list-table';
import type { ApplicationsListRowActionHandlers } from '@/features/livestock-application/components/applications-list/applications-list-row-actions';
import { LivestockApplicationDetailPanel } from '@/features/livestock-application/components/livestock-application-detail-panel';
import { LivestockApplicationsPagination } from '@/features/livestock-application/components/shared/livestock-applications-pagination';
import { useLivestockApplicationDetail } from '@/features/livestock-application/hooks/use-livestock-applications';
import type { LivestockApplicationListItem } from '@/features/livestock-application/domain/application-types';
import type { SonarwaReviewScope } from '@/features/livestock-application/api/endpoints';
import {
  isAtOrPastSonarwaReview,
  isAwaitingSonarwaReview,
} from '@/features/livestock-application/utils/workflow-rules';
import { useSonarwaApplicationsList } from '@/features/sonarwa-portal/hooks/use-sonarwa-applications';

const DETAIL_BASE = '/sonarwa/livestock/applications';

function getFirstDayOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function SonarwaApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openFromUrl = searchParams.get('open');

  const [startDate, setStartDate] = useState(getFirstDayOfMonth);
  const [endDate, setEndDate] = useState(getTodayDate);
  const [reviewScope, setReviewScope] = useState<SonarwaReviewScope>('pending');
  const [search, setSearch] = useState('');

  const {
    application: panelApplication,
    isLoading: panelLoading,
    error: panelError,
    reload: reloadPanelApplication,
  } = useLivestockApplicationDetail(openFromUrl, { scope: 'all' });

  const { applications, meta, pageNumber, pageSize, isLoading, error, load } =
    useSonarwaApplicationsList();

  const reloadList = useCallback(
    (page = pageNumber, size = pageSize) => {
      void load(startDate, endDate, page, size, reviewScope);
    },
    [endDate, load, pageNumber, pageSize, reviewScope, startDate],
  );

  useEffect(() => {
    void load(startDate, endDate, 1, pageSize, reviewScope);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset to page 1 when filters change
  }, [load, startDate, endDate, reviewScope]);

  const openApplication = useCallback((app: LivestockApplicationListItem) => {
    router.replace(`${DETAIL_BASE}?open=${encodeURIComponent(app._id)}`, { scroll: false });
  }, [router]);

  const closeApplicationPanel = useCallback(() => {
    router.replace(DETAIL_BASE, { scroll: false });
  }, [router]);

  const handleApplicationUpdated = useCallback(() => {
    reloadList();
    void reloadPanelApplication();
  }, [reloadList, reloadPanelApplication]);

  const rowActions = useMemo<ApplicationsListRowActionHandlers>(
    () => ({ onViewDetails: openApplication }),
    [openApplication],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return applications;
    return applications.filter((app) => {
      const haystack = [
        app.applicationNumber,
        app.ownerSummary,
        app.vetName,
        app.status,
        app.livestockLocation?.district,
        app.livestockLocation?.sector,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [applications, search]);

  const panelAccessDenied =
    panelApplication !== null && !isAtOrPastSonarwaReview(panelApplication);
  const panelReadOnly =
    panelApplication !== null &&
    isAtOrPastSonarwaReview(panelApplication) &&
    !isAwaitingSonarwaReview(panelApplication);

  const emptyMessage =
    reviewScope === 'pending'
      ? 'There are no applications awaiting SONARWA review in this period.'
      : 'There are no applications at or past the SONARWA review stage in this period.';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--sonarwa-primary)]">
            Livestock packages
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Applications
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Review livestock applications at the SONARWA verification stage. Default range is the
            current month; change dates or switch to all reviewed applications as needed.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: 'pending', label: 'Pending SONARWA review' },
                { value: 'all', label: 'All (at or past review)' },
              ] as const
            ).map((option) => {
              const active = reviewScope === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReviewScope(option.value)}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[var(--sonarwa-primary)] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-12">
            <div className="relative lg:col-span-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search number, owner, vet, location…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm focus:border-[var(--sonarwa-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--sonarwa-soft)]"
              />
            </div>

            <div className="flex flex-wrap items-end gap-3 lg:col-span-7">
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
                  <Calendar className="h-3.5 w-3.5" /> From
                </label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={getTodayDate()}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <Button type="button" variant="outline" disabled={isLoading} onClick={() => reloadList()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ApplicationsListTable
            applications={filtered}
            isLoading={isLoading}
            isVet={false}
            emptyMessage={emptyMessage}
            rowActions={rowActions}
          />

          <LivestockApplicationsPagination
            currentPage={pageNumber}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            itemsPerPage={pageSize}
            disabled={isLoading}
            onPageChange={(page) => void load(startDate, endDate, page, pageSize, reviewScope)}
            onItemsPerPageChange={(size) => void load(startDate, endDate, 1, size, reviewScope)}
          />
        </div>
      </div>

      <LivestockApplicationDetailPanel
        isOpen={Boolean(openFromUrl)}
        application={panelAccessDenied ? null : panelApplication}
        isLoading={panelLoading}
        error={
          panelAccessDenied
            ? 'This application is outside the SONARWA review stage.'
            : panelError
        }
        viewRole="sonarwa"
        onClose={closeApplicationPanel}
        onUpdated={handleApplicationUpdated}
      />

      {panelReadOnly && openFromUrl && !panelAccessDenied && !panelLoading && (
        <p className="sr-only">
          This application has already been reviewed by SONARWA and is shown read-only.
        </p>
      )}
    </div>
  );
}
