'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Car,
  DollarSign,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
} from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataExportActions } from '@/components/ui/data-export-actions';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { formatDateUTC } from '@/utils/date-formatter';
import { formatPoliceNumberForExport } from '@/utils/police-number';
import { MotorApplicationDetailsModal } from '@/features/admin-motor-applications/motor-application-details-modal';
import { MotorApplicationStatusBadge } from '@/features/admin-motor-applications/motor-application-status-badge';
import type { Application } from '@/features/admin-motor-applications/types';
import { fetchPlateLookup } from './plate-lookup-api';
import {
  exportPlateLookupToExcel,
  exportPlateLookupToPdf,
  type PlateLookupExportRow,
} from './plate-lookup-exports';
import { normalizePlateNumber } from './normalize';
import type {
  PlateLookupApplicationRow,
  PlateLookupPerformerKind,
  PlateLookupResult,
  PlateLookupStats,
  PlateLookupViewRole,
} from './types';

function pageCopy(role: PlateLookupViewRole) {
  if (role === 'finance') {
    return { eyebrow: 'Finance · Motor', title: 'Plate Lookup' };
  }
  if (role === 'super_admin') {
    return { eyebrow: 'Super Admin · Motor', title: 'Plate Lookup' };
  }
  return { eyebrow: 'Admin · Motor', title: 'Plate Lookup' };
}

function formatRwf(value: number): string {
  return `${value.toLocaleString()} RWF`;
}

function getFirstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function performerBadgeClass(kind: PlateLookupPerformerKind): string {
  if (kind === 'admin') return 'bg-indigo-100 text-indigo-800';
  if (kind === 'agent') return 'bg-emerald-100 text-emerald-800';
  return 'bg-slate-100 text-slate-700';
}

function performerKindLabel(kind: PlateLookupPerformerKind): string {
  if (kind === 'admin') return 'Admin';
  if (kind === 'agent') return 'Agent';
  return 'Client';
}

const EMPTY_STATS: PlateLookupStats = {
  applicationCount: 0,
  totalNetPremium: 0,
  totalAmountPaid: 0,
};

export interface PlateLookupPageProps {
  viewRole?: PlateLookupViewRole;
}

export default function PlateLookupPage({
  viewRole = 'admin',
}: PlateLookupPageProps) {
  const copy = pageCopy(viewRole);
  const { token } = useAuth();
  const { showToast, ToastContainer } = useToast();

  const [plateInput, setPlateInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PlateLookupResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingApplication, setViewingApplication] =
    useState<Application | null>(null);
  const itemsPerPage = 12;

  useEffect(() => {
    setStartDate(getFirstDayOfMonth());
    setEndDate(getToday());
  }, []);

  const runSearch = useCallback(async () => {
    if (!token) {
      showToast('You must be signed in to search plate history', 'error');
      return;
    }

    const plateNumber = normalizePlateNumber(plateInput);
    if (!plateNumber) {
      showToast('Enter a plate number to search', 'error');
      return;
    }
    if (!startDate || !endDate) {
      showToast('Select a start and end date', 'error');
      return;
    }
    if (startDate > endDate) {
      showToast('Start date must be on or before end date', 'error');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const next = await fetchPlateLookup(token, {
        plateNumber,
        startDate,
        endDate,
      });
      setResult(next);
      setCurrentPage(1);
    } catch (error) {
      setResult(null);
      showToast(
        error instanceof Error ? error.message : 'Failed to load plate history',
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  }, [endDate, plateInput, showToast, startDate, token]);

  const handleReset = useCallback(() => {
    setPlateInput('');
    setStartDate(getFirstDayOfMonth());
    setEndDate(getToday());
    setHasSearched(false);
    setResult(null);
    setCurrentPage(1);
  }, []);

  const applications = result?.applications ?? [];
  const stats = result?.stats ?? EMPTY_STATS;
  const totalPages = Math.max(1, Math.ceil(applications.length / itemsPerPage));
  const paginatedApplications = applications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const exportRows = useMemo<PlateLookupExportRow[]>(
    () =>
      applications.map((app) => ({
        applicationNumber: app.applicationNumber,
        submittedAt: app.submittedAt,
        clientName: app.clientName,
        insuranceCategory: app.insuranceCategory,
        status: app.status,
        netPremium: app.netPremium,
        amount: app.amount,
        performedByKind: performerKindLabel(app.performedBy.kind),
        performedByName: app.performedBy.name,
        policeNumber: formatPoliceNumberForExport(app.application) || '—',
      })),
    [applications],
  );

  const exportParams = useMemo(
    () => ({
      rows: exportRows,
      plateNumber: result?.plateNumber ?? normalizePlateNumber(plateInput),
      startDate: result?.startDate ?? startDate,
      endDate: result?.endDate ?? endDate,
      stats,
    }),
    [endDate, exportRows, plateInput, result, startDate, stats],
  );

  const handleExportExcel = useCallback(async () => {
    if (exportRows.length === 0) {
      showToast('No applications to export for this plate', 'error');
      return;
    }
    try {
      await exportPlateLookupToExcel(exportParams);
      showToast('Plate history exported to Excel', 'success');
    } catch (error) {
      console.error('Excel export failed:', error);
      showToast('Failed to export Excel file', 'error');
    }
  }, [exportParams, exportRows.length, showToast]);

  const handleExportPdf = useCallback(async () => {
    if (exportRows.length === 0) {
      showToast('No applications to export for this plate', 'error');
      return;
    }
    try {
      await exportPlateLookupToPdf(exportParams);
      showToast('Plate history exported to PDF', 'success');
    } catch (error) {
      console.error('PDF export failed:', error);
      showToast('Failed to export PDF file', 'error');
    }
  }, [exportParams, exportRows.length, showToast]);

  return (
    <MainLayout>
      <ToastContainer />
      <div className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {copy.eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Search a vehicle plate number and review linked motor applications
            for a date range — including who performed each application, net
            premium totals, and amounts paid after payment verification.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <form
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6"
            onSubmit={(event) => {
              event.preventDefault();
              void runSearch();
            }}
          >
            <label className="block xl:col-span-2">
              <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                <Car className="h-3.5 w-3.5" aria-hidden />
                Plate number
              </span>
              <Input
                type="text"
                label="Plate number"
                name="plateNumber"
                hideLabel
                value={plateInput}
                onChange={(e) => setPlateInput(e.target.value)}
                placeholder="e.g. RAD123A"
                className="font-semibold tracking-wide uppercase"
              />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                Start date
              </span>
              <Input
                type="date"
                label="Start date"
                name="startDate"
                hideLabel
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                End date
              </span>
              <Input
                type="date"
                label="End date"
                name="endDate"
                hideLabel
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Search className="h-4 w-4" aria-hidden />
                )}
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isLoading}
                className="inline-flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                Reset
              </Button>
            </div>
          </form>
        </section>

        {!hasSearched && !isLoading ? (
          <IdleEmptyState />
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-20 text-sm text-slate-500 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading plate history…
          </div>
        ) : result ? (
          <>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-sm">
              <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-white/10 p-2.5">
                    <Car className="h-6 w-6 text-white" aria-hidden />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                      Vehicle plate
                    </p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-wider sm:text-3xl">
                      {result.plateNumber}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {result.startDate} → {result.endDate}
                    </p>
                  </div>
                </div>
                {(result.vehicle?.vehicleType ||
                  result.vehicle?.chasisNumber ||
                  result.vehicle?.vehicleUse) && (
                  <div className="grid gap-1 text-sm text-slate-200 sm:text-right">
                    {result.vehicle.vehicleType ? (
                      <p>
                        <span className="text-slate-400">Type · </span>
                        {result.vehicle.vehicleType}
                      </p>
                    ) : null}
                    {result.vehicle.vehicleUse ? (
                      <p>
                        <span className="text-slate-400">Use · </span>
                        {result.vehicle.vehicleUse}
                      </p>
                    ) : null}
                    {result.vehicle.chasisNumber ? (
                      <p>
                        <span className="text-slate-400">Chassis · </span>
                        <span className="font-mono">
                          {result.vehicle.chasisNumber}
                        </span>
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                icon={FileText}
                label="Applications"
                value={String(stats.applicationCount)}
                hint="Linked to this plate in range"
              />
              <StatCard
                icon={Wallet}
                label="Total net premium"
                value={formatRwf(stats.totalNetPremium)}
                hint="All applications in range"
              />
              <StatCard
                icon={DollarSign}
                label="Total amount paid"
                value={formatRwf(stats.totalAmountPaid)}
                hint="Payment verified or insurance issued"
              />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Applications
                  </h2>
                  <p className="text-xs text-slate-500">
                    {applications.length} result
                    {applications.length === 1 ? '' : 's'} for{' '}
                    <span className="font-mono font-medium text-slate-700">
                      {result.plateNumber}
                    </span>
                  </p>
                </div>
                <DataExportActions
                  disabled={isLoading || exportRows.length === 0}
                  onExportExcel={handleExportExcel}
                  onExportPdf={handleExportPdf}
                  className="shrink-0 justify-end"
                />
              </div>

              {applications.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No applications found for this plate
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Try widening the date range or confirm the plate number.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-max w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="whitespace-nowrap px-4 py-3">
                            Application
                          </th>
                          <th className="whitespace-nowrap px-4 py-3">
                            Submitted
                          </th>
                          <th className="whitespace-nowrap px-4 py-3">Client</th>
                          <th className="whitespace-nowrap px-4 py-3">
                            Category
                          </th>
                          <th className="whitespace-nowrap px-4 py-3">Status</th>
                          <th className="whitespace-nowrap px-4 py-3 text-right">
                            Net premium
                          </th>
                          <th className="whitespace-nowrap px-4 py-3 text-right">
                            Amount
                          </th>
                          <th className="whitespace-nowrap px-4 py-3">
                            Performed by
                          </th>
                          <th className="whitespace-nowrap px-4 py-3">
                            Police #
                          </th>
                          <th className="whitespace-nowrap px-4 py-3">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedApplications.map((app) => (
                          <ApplicationRow
                            key={app._id || app.applicationNumber}
                            app={app}
                            onView={() => setViewingApplication(app.application)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6">
                      <p className="text-xs text-slate-500">
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={currentPage <= 1}
                          onClick={() =>
                            setCurrentPage((page) => Math.max(1, page - 1))
                          }
                        >
                          Previous
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={currentPage >= totalPages}
                          onClick={() =>
                            setCurrentPage((page) =>
                              Math.min(totalPages, page + 1),
                            )
                          }
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
            Unable to load plate history. Adjust filters and search again.
          </div>
        )}
      </div>

      <MotorApplicationDetailsModal
        application={viewingApplication}
        onClose={() => setViewingApplication(null)}
      />
    </MainLayout>
  );
}

function ApplicationRow({
  app,
  onView,
}: {
  app: PlateLookupApplicationRow;
  onView: () => void;
}) {
  return (
    <tr className="hover:bg-slate-50/80">
      <td className="px-4 py-3 font-medium text-slate-900">
        {app.applicationNumber}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
        {app.submittedAt ? formatDateUTC(app.submittedAt) : '—'}
      </td>
      <td className="px-4 py-3 text-slate-700">{app.clientName}</td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
        {app.insuranceCategory}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <MotorApplicationStatusBadge status={app.status} />
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900">
        {formatRwf(app.netPremium)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
        {formatRwf(app.amount)}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${performerBadgeClass(app.performedBy.kind)}`}
        >
          {performerKindLabel(app.performedBy.kind)}
        </span>
        <p className="mt-1 text-xs text-slate-500">{app.performedBy.name}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
        {app.policeNumber || '—'}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <Button
          size="sm"
          variant="text"
          className="inline-flex items-center gap-1"
          onClick={onView}
        >
          <Eye className="h-4 w-4" aria-hidden />
          View
        </Button>
      </td>
    </tr>
  );
}

function IdleEmptyState() {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-20 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <Search className="h-6 w-6 text-slate-500" aria-hidden />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-slate-900">
        Enter a plate number to view application history
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        Results include applications linked to that plate in the selected date
        range, with premium and paid totals plus who performed each application.
      </p>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-2.5">
          <Icon className="h-5 w-5 text-blue-700" aria-hidden />
        </div>
      </div>
    </div>
  );
}
