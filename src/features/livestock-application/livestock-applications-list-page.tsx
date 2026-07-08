'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApplicationsListFiltersBar } from '@/features/livestock-application/components/applications-list/applications-list-filters-bar';
import { ApplicationsListTable } from '@/features/livestock-application/components/applications-list/applications-list-table';
import type { ApplicationsListRowActionHandlers } from '@/features/livestock-application/components/applications-list/applications-list-row-actions';
import { LivestockApplicationDetailPanel } from '@/features/livestock-application/components/livestock-application-detail-panel';
import { LivestockApplicationsPagination } from '@/features/livestock-application/components/shared/livestock-applications-pagination';
import {
  useLivestockApplicationDetail,
  useLivestockApplicationsList,
} from '@/features/livestock-application/hooks/use-livestock-applications';
import type { LivestockApplicationViewRole } from '@/features/livestock-application/domain/application-types';
import type { LivestockApplicationListItem } from '@/features/livestock-application/domain/application-types';
import {
  applyApplicationsListFilters,
  getDefaultApplicationsListFilters,
  hasActiveListFilters,
  type ApplicationsListFilters,
} from '@/features/livestock-application/utils/applications-list-filters';
import { useAuth } from '@/context/AuthContext';

const getDefaultStartDate = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
};

const getTodayDate = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

function listConfig(role: LivestockApplicationViewRole) {
  if (role === 'admin') {
    return {
      title: 'Livestock applications',
      subtitle: 'Review vet submissions, verify payments, and track nkunganire workflow.',
      detailBase: '/admin/livestock/applications',
      showNewButton: false,
    };
  }
  if (role === 'finance') {
    return {
      title: 'Livestock applications',
      subtitle:
        'Filter by payment status, species, and workflow stage — open an application to review details and documents.',
      detailBase: '/finance/livestock/applications',
      showNewButton: false,
    };
  }
  if (role === 'super_admin') {
    return {
      title: 'Livestock applications',
      subtitle: 'Read-only view of all livestock insurance packages across providers.',
      detailBase: '/super_admin/livestock/applications',
      showNewButton: false,
    };
  }
  return {
    title: 'My applications',
    subtitle: 'Packages you submitted — open an application to review owners, animals, and documents.',
    detailBase: '/vet/livestock/applications',
    showNewButton: true,
  };
}

export interface LivestockApplicationsListPageProps {
  viewRole?: LivestockApplicationViewRole;
}

export default function LivestockApplicationsListPage({
  viewRole = 'vet',
}: LivestockApplicationsListPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openFromUrl = searchParams.get('open');
  const { user } = useAuth();
  const config = listConfig(viewRole);
  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getTodayDate);
  const [filters, setFilters] = useState<ApplicationsListFilters>(() =>
    getDefaultApplicationsListFilters(viewRole),
  );
  const isVet = viewRole === 'vet';
  const listScope = isVet ? 'vet' : 'all';
  const vetId = isVet ? user?._id : undefined;
  const {
    application: panelApplication,
    isLoading: panelLoading,
    error: panelError,
    reload: reloadPanelApplication,
  } = useLivestockApplicationDetail(openFromUrl, { scope: listScope });
  const {
    applications,
    meta,
    pageNumber,
    pageSize,
    isLoading,
    error,
    load,
    goToPage,
    changePageSize,
  } = useLivestockApplicationsList({
    scope: listScope,
    vetAgentId: vetId,
  });

  const filtersActive = hasActiveListFilters(filters, viewRole);

  const handleApplicationUpdated = useCallback(() => {
    void load(startDate, endDate, pageNumber, pageSize);
    void reloadPanelApplication();
  }, [endDate, load, pageNumber, pageSize, reloadPanelApplication, startDate]);

  useEffect(() => {
    if (isVet && !vetId) return;
    void load(startDate, endDate, 1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset to page 1 when date filters change
  }, [load, startDate, endDate, vetId, isVet]);

  const openApplication = useCallback(
    (app: LivestockApplicationListItem) => {
      router.replace(`${config.detailBase}?open=${encodeURIComponent(app._id)}`, {
        scroll: false,
      });
    },
    [config.detailBase, router],
  );

  const closeApplicationPanel = useCallback(() => {
    router.replace(config.detailBase, { scroll: false });
  }, [config.detailBase, router]);

  const rowActions = useMemo<ApplicationsListRowActionHandlers>(
    () => ({
      onViewDetails: openApplication,
    }),
    [openApplication],
  );

  const filtered = useMemo(
    () => applyApplicationsListFilters(applications, filters),
    [applications, filters],
  );

  const emptyMessage = filtersActive
    ? 'No matches on this page. Try another page, widen the date range, or clear filters.'
    : 'No applications in this period. Try widening the date range above.';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Livestock packages
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {config.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{config.subtitle}</p>
          </div>
          {config.showNewButton && (
            <Button as="a" href="/vet/livestock/applications/new" variant="primary">
              <Plus className="mr-2 h-4 w-4" />
              New application
            </Button>
          )}
        </header>

        <ApplicationsListFiltersBar
          filters={filters}
          startDate={startDate}
          endDate={endDate}
          maxEndDate={getTodayDate()}
          isLoading={isLoading}
          viewRole={viewRole}
          onFiltersChange={setFilters}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onRefresh={() => void load(startDate, endDate, pageNumber, pageSize)}
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ApplicationsListTable
            applications={filtered}
            isLoading={isLoading}
            isVet={isVet}
            emptyMessage={emptyMessage}
            rowActions={rowActions}
          />

          <LivestockApplicationsPagination
            currentPage={pageNumber}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            itemsPerPage={pageSize}
            disabled={isLoading}
            onPageChange={(page) => goToPage(startDate, endDate, page)}
            onItemsPerPageChange={(size) => changePageSize(startDate, endDate, size)}
          />
        </div>
      </div>

      <LivestockApplicationDetailPanel
        isOpen={Boolean(openFromUrl)}
        application={panelApplication}
        isLoading={panelLoading}
        error={panelError}
        viewRole={viewRole}
        onClose={closeApplicationPanel}
        onUpdated={handleApplicationUpdated}
      />
    </div>
  );
}
