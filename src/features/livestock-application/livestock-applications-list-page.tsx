'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Calendar, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LivestockApplicationDetailPanel } from '@/features/livestock-application/components/livestock-application-detail-panel';
import { ApiContractPanel } from '@/features/livestock-application/components/shared/api-contract-panel';
import { LivestockApplicationStatusBadge } from '@/features/livestock-application/components/shared/application-status-badge';
import {
  PaymentStatusBadge,
  SubsidyStatusBadge,
} from '@/features/livestock-application/components/shared/workflow-status-badges';
import { useLivestockApplicationsList } from '@/features/livestock-application/hooks/use-livestock-applications';
import { ownerModeLabel, speciesGroupLabel } from '@/features/livestock-application/domain/form-profiles';
import type { LivestockApplicationViewRole } from '@/features/livestock-application/domain/application-types';
import type { LivestockApplicationListItem } from '@/features/livestock-application/domain/application-types';
import {
  formatPolicyDate,
  formatSubmittedDateTime,
} from '@/features/livestock-application/utils/application-location';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { resolveApplicationPackageById } from '@/features/livestock-application/utils/resolve-application-package';
import { useAuth } from '@/context/AuthContext';
import { insuranceProviderLabel } from '@/shared/insurance-providers';

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
      subtitle: 'Review vet submissions, verify payments, and track nkunganire workflow.',
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
    subtitle: 'Packages you submitted — open a row to review premiums, location, and workflow status.',
    detailBase: '/vet/livestock/applications',
    showNewButton: true,
  };
}

function matchesSearch(app: LivestockApplicationListItem, query: string): boolean {
  const location = app.livestockLocation;
  const haystack = [
    app.applicationNumber,
    app.ownerSummary,
    app.vetName,
    app.insuranceProvider,
    app.insuranceType,
    app.speciesGroup,
    app.ownerMode,
    app.paidStatus,
    app.subsidyStatus,
    location?.district,
    location?.sector,
    location?.province,
    location?.village,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function CoverageCell({ app }: { app: LivestockApplicationListItem }) {
  return (
    <div>
      <p className="font-medium text-slate-900">{speciesGroupLabel(app.speciesGroup)}</p>
      <p className="text-xs text-slate-500">{ownerModeLabel(app.ownerMode)}</p>
      {app.insuranceType && (
        <p className="mt-0.5 text-xs font-medium text-slate-600">{app.insuranceType}</p>
      )}
    </div>
  );
}

function PolicyPeriodCell({ app }: { app: LivestockApplicationListItem }) {
  return (
    <div className="text-slate-700">
      <p>{formatPolicyDate(app.policyStartDate)}</p>
      <p className="text-xs text-slate-500">to {formatPolicyDate(app.policyEndDate)}</p>
    </div>
  );
}

function AmountsCell({ app }: { app: LivestockApplicationListItem }) {
  return (
    <div>
      <p className="font-semibold text-emerald-700">
        {formatRwfDisplay(app.totals.farmerContributionAmount)}
      </p>
      <p className="text-xs text-slate-500">
        Premium {formatRwfDisplay(app.totals.premiumRateAmount)}
      </p>
    </div>
  );
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
  const [search, setSearch] = useState('');
  const isVet = viewRole === 'vet';
  const listScope = isVet ? 'vet' : 'all';
  const vetId = isVet ? user?._id : undefined;
  const { applications, isLoading, error, load } = useLivestockApplicationsList({
    scope: listScope,
    vetAgentId: vetId,
  });

  const colSpan = isVet ? 8 : 10;

  const panelApplication = useMemo(() => {
    if (!openFromUrl) return null;
    return resolveApplicationPackageById(openFromUrl);
  }, [openFromUrl, applications]);

  useEffect(() => {
    if (isVet && !vetId) return;
    void load(startDate, endDate);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((app) => matchesSearch(app, q));
  }, [applications, search]);

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

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder={
                  isVet
                    ? 'Search by number, location, species, or status…'
                    : 'Search by number, vet, location, species, or status…'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
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
              <label className="mb-1 text-xs font-medium text-slate-600">To</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={getTodayDate()}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => void load(startDate, endDate)}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[64rem] w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Application</th>
                  {!isVet && <th className="px-4 py-3">Provider</th>}
                  {!isVet && <th className="px-4 py-3">Veterinarian</th>}
                  <th className="px-4 py-3">Coverage</th>
                  <th className="px-4 py-3">Policy period</th>
                  <th className="px-4 py-3">Sum assured</th>
                  <th className="px-4 py-3">Farmer / premium</th>
                  <th className="px-4 py-3">Payment & subsidy</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-12 text-center text-slate-500">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-12 text-center text-slate-500">
                      No applications in this period. Try widening the date range above.
                    </td>
                  </tr>
                ) : (
                  filtered.map((app) => (
                    <tr key={app._id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{app.applicationNumber}</p>
                        <p className="text-xs text-slate-500">
                          {formatSubmittedDateTime(app.submittedAt)}
                        </p>
                      </td>
                      {!isVet && (
                        <td className="px-4 py-4 text-slate-700">
                          {insuranceProviderLabel(app.insuranceProvider)}
                        </td>
                      )}
                      {!isVet && (
                        <td className="px-4 py-4 text-slate-700">
                          {app.vetName ?? '—'}
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <CoverageCell app={app} />
                      </td>
                      <td className="px-4 py-4">
                        <PolicyPeriodCell app={app} />
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {formatRwfDisplay(app.totalSumAssured ?? 0)}
                      </td>
                      <td className="px-4 py-4">
                        <AmountsCell app={app} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1.5">
                          <PaymentStatusBadge status={app.paidStatus ?? app.paymentProofStatus} />
                          <SubsidyStatusBadge status={app.subsidyStatus} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <LivestockApplicationStatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openApplication(app)}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
                        >
                          View details
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ApiContractPanel contractKey={isVet ? 'listApplications' : 'listAllApplications'} />
      </div>

      <LivestockApplicationDetailPanel
        isOpen={panelApplication !== null}
        application={panelApplication}
        viewRole={viewRole}
        onClose={closeApplicationPanel}
      />
    </div>
  );
}
