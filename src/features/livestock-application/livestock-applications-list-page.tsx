'use client';

import Link from 'next/link';
import { ArrowRight, Calendar, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiContractPanel } from '@/features/livestock-application/components/shared/api-contract-panel';
import { LivestockApplicationStatusBadge } from '@/features/livestock-application/components/shared/application-status-badge';
import { useLivestockApplicationsList } from '@/features/livestock-application/hooks/use-livestock-applications';
import { ownerModeLabel, speciesGroupLabel } from '@/features/livestock-application/domain/form-profiles';
import type { LivestockApplicationViewRole } from '@/features/livestock-application/domain/application-types';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
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
    subtitle: 'One application can include many animals and one payment proof.',
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
  const { user } = useAuth();
  const config = listConfig(viewRole);
  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getTodayDate);
  const [search, setSearch] = useState('');
  const vetId = viewRole === 'vet' ? user?._id : undefined;
  const { applications, isLoading, error, load } = useLivestockApplicationsList(vetId);

  useEffect(() => {
    if (viewRole === 'vet' && !vetId) return;
    void load(startDate, endDate);
  }, [load, startDate, endDate, vetId, viewRole]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(
      (a) =>
        a.applicationNumber.toLowerCase().includes(q) ||
        a.ownerSummary.toLowerCase().includes(q) ||
        (a.insuranceProvider?.toLowerCase().includes(q) ?? false),
    );
  }, [applications, search]);

  const colSpan = viewRole === 'vet' ? 7 : 8;

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
                placeholder="Search by number, owner, or provider…"
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
            <table className="min-w-[60rem] w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Application</th>
                  {viewRole !== 'vet' && <th className="px-4 py-3">Provider</th>}
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Owner(s)</th>
                  <th className="px-4 py-3">Lines</th>
                  <th className="px-4 py-3">Farmer due</th>
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
                          {new Date(app.submittedAt).toLocaleDateString()}
                        </p>
                      </td>
                      {viewRole !== 'vet' && (
                        <td className="px-4 py-4 text-slate-700">
                          {insuranceProviderLabel(app.insuranceProvider)}
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <p className="text-slate-800">{speciesGroupLabel(app.speciesGroup)}</p>
                        <p className="text-xs text-slate-500">{ownerModeLabel(app.ownerMode)}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{app.ownerSummary}</td>
                      <td className="px-4 py-4 font-medium">{app.lineCount}</td>
                      <td className="px-4 py-4 font-medium text-emerald-700">
                        {formatRwfDisplay(app.totals.farmerContributionAmount)}
                      </td>
                      <td className="px-4 py-4">
                        <LivestockApplicationStatusBadge status={app.status} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`${config.detailBase}/${app._id}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Open
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ApiContractPanel contractKey="listApplications" />
      </div>
    </div>
  );
}
