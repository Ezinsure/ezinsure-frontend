'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  DollarSign,
  Eye,
  FileText,
  Loader2,
  PencilLine,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataExportActions } from '@/components/ui/data-export-actions';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { formatDateUTC } from '@/utils/date-formatter';
import { formatPoliceNumberForExport } from '@/utils/police-number';
import { fetchCompanyPerformanceApplications } from '@/features/company-performance/company-performance-api';
import type {
  CompanyPerformanceApplication,
  CompanyPerformanceViewRole,
} from '@/features/company-performance/types';
import {
  MOTOR_APPLICATION_STATUS_FILTER_OPTIONS,
  MotorApplicationStatusBadge,
} from '@/features/admin-motor-applications/motor-application-status-badge';
import { MotorApplicationDetailsModal } from '@/features/admin-motor-applications/motor-application-details-modal';
import { MotorApplicationEditModal } from '@/features/admin-motor-applications/motor-application-edit-modal';
import type { Application } from '@/features/admin-motor-applications/types';
import {
  exportCompanyPerformanceToExcel,
  exportCompanyPerformanceToPdf,
  type CompanyPerformanceExportRow,
} from '@/shared/export/company-performance-exports';

function pageCopy(role: CompanyPerformanceViewRole) {
  if (role === 'finance') {
    return { eyebrow: 'Finance · Motor', title: 'Company Performance' };
  }
  if (role === 'super_admin') {
    return { eyebrow: 'Super Admin · Motor', title: 'Company Performance' };
  }
  return { eyebrow: 'Admin · Motor', title: 'Company Performance' };
}

function formatRwf(value: number): string {
  return `${value.toLocaleString()} RWF`;
}

function getFirstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function channelBadgeClass(channel: CompanyPerformanceApplication['channel']): string {
  return channel === 'admin'
    ? 'bg-indigo-100 text-indigo-800'
    : 'bg-emerald-100 text-emerald-800';
}

export interface CompanyPerformancePageProps {
  viewRole?: CompanyPerformanceViewRole;
}

export default function CompanyPerformancePage({
  viewRole = 'admin',
}: CompanyPerformancePageProps) {
  const copy = pageCopy(viewRole);
  const { token } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const canEdit = viewRole !== 'finance';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState<CompanyPerformanceApplication[]>([]);
  const [totals, setTotals] = useState({
    applicationCount: 0,
    totalCompanyCommission: 0,
    totalAdministrationFees: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingApplication, setViewingApplication] = useState<Application | null>(null);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    setStartDate(getFirstDayOfMonth());
    setEndDate(getToday());
  }, []);

  const loadData = useCallback(async () => {
    if (!token || !startDate || !endDate) return;

    setIsLoading(true);
    try {
      const result = await fetchCompanyPerformanceApplications(token, startDate, endDate);
      setApplications(result.applications);
      setTotals(result.totals);
      setCurrentPage(1);
    } catch (error) {
      setApplications([]);
      setTotals({
        applicationCount: 0,
        totalCompanyCommission: 0,
        totalAdministrationFees: 0,
      });
      showToast(
        error instanceof Error ? error.message : 'Failed to load company performance data',
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  }, [endDate, showToast, startDate, token]);

  useEffect(() => {
    if (token && startDate && endDate) {
      void loadData();
    }
  }, [token, startDate, endDate, loadData]);

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return applications.filter((app) => {
      const matchesStatus =
        selectedStatus === 'all' ||
        app.status.toLowerCase() === selectedStatus.toLowerCase();

      if (!matchesStatus) return false;
      if (!query) return true;

      const haystack = [
        app.applicationNumber,
        app.clientName,
        app.performerName,
        app.channelLabel,
        app.insuranceCategory,
        app.status,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [applications, searchQuery, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / itemsPerPage));
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const exportRows = useMemo<CompanyPerformanceExportRow[]>(
    () =>
      filteredApplications.map((app) => {
        // Prefer nested application payload; never fall back to `amount`.
        const netPremium = Number(
          app.application?.netPremium ?? app.netPremium ?? 0,
        );
        const amount = Number(app.application?.amount ?? app.amount ?? 0);

        return {
          applicationNumber: app.applicationNumber,
          clientName: app.clientName,
          channel: app.channelLabel,
          performerName: app.channel === 'admin' ? app.performerName : '—',
          insuranceCategory: app.insuranceCategory,
          status: app.status,
          submittedAt: app.submittedAt,
          policeNumber: formatPoliceNumberForExport(app.application),
          amount: Number.isFinite(amount) ? amount : 0,
          netPremium: Number.isFinite(netPremium) ? netPremium : 0,
          companyCommission: app.companyCommission,
          administrationFees: app.administrationFees,
        };
      }),
    [filteredApplications],
  );

  const exportParams = useMemo(
    () => ({
      rows: exportRows,
      startDate,
      endDate,
      searchQuery,
      statusFilter: selectedStatus,
    }),
    [exportRows, startDate, endDate, searchQuery, selectedStatus],
  );

  const handleExportExcel = useCallback(async () => {
    if (exportRows.length === 0) {
      showToast('No applications to export for the current filters', 'error');
      return;
    }
    try {
      await exportCompanyPerformanceToExcel(exportParams);
      showToast('Company performance exported to Excel', 'success');
    } catch (error) {
      console.error('Excel export failed:', error);
      showToast('Failed to export Excel file', 'error');
    }
  }, [exportParams, exportRows.length, showToast]);

  const handleExportPdf = useCallback(async () => {
    if (exportRows.length === 0) {
      showToast('No applications to export for the current filters', 'error');
      return;
    }
    try {
      await exportCompanyPerformanceToPdf(exportParams);
      showToast('Company performance exported to PDF', 'success');
    } catch (error) {
      console.error('PDF export failed:', error);
      showToast('Failed to export PDF file', 'error');
    }
  }, [exportParams, exportRows.length, showToast]);

  return (
    <MainLayout>
      <ToastContainer />
      <div className="space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {copy.eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Direct-channel motor applications brought by admins or clients (10% company
              commission) with administration fees for the selected period.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadData()}
            disabled={isLoading || !startDate || !endDate}
            className="inline-flex items-center gap-2 self-start"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden />
            )}
            Refresh
          </Button>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--main-blue)]"
              >
                {MOTOR_APPLICATION_STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2 xl:col-span-2">
              <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                <Search className="h-3.5 w-3.5" aria-hidden />
                Search
              </span>
              <Input
                type="search"
                label="Search"
                name="search"
                hideLabel
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Application #, client, admin, category…"
              />
            </label>
          </div>
          {(selectedStatus !== 'all' || searchQuery) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {selectedStatus !== 'all' && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 font-medium text-green-800">
                  Status: {selectedStatus.replace(/_/g, ' ')}
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-800">
                  Search: {searchQuery}
                </span>
              )}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            icon={FileText}
            label="Applications"
            value={String(totals.applicationCount)}
            hint="Admin & client channel"
          />
          <StatCard
            icon={Building2}
            label="Total company commission"
            value={formatRwf(totals.totalCompanyCommission)}
            hint="10% direct channel"
          />
          <StatCard
            icon={DollarSign}
            label="Total administration fees"
            value={formatRwf(totals.totalAdministrationFees)}
            hint="Admin fees collected"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" aria-hidden />
              <h2 className="text-sm font-semibold text-slate-900">Applications</h2>
              <p className="text-xs text-slate-500">
                {filteredApplications.length} result{filteredApplications.length === 1 ? '' : 's'}
              </p>
            </div>
            <DataExportActions
              disabled={isLoading || exportRows.length === 0}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              className="shrink-0 justify-end"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Loading company performance…
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              No applications found for this date range.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-max w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">Application</th>
                      <th className="whitespace-nowrap px-4 py-3">Client</th>
                      <th className="whitespace-nowrap px-4 py-3">Channel</th>
                      <th className="whitespace-nowrap px-4 py-3">Category</th>
                      <th className="whitespace-nowrap px-4 py-3">Status</th>
                      <th className="whitespace-nowrap px-4 py-3">Submitted</th>
                      <th className="whitespace-nowrap px-4 py-3 text-right">Company commission</th>
                      <th className="whitespace-nowrap px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedApplications.map((app) => (
                      <tr key={app._id || app.applicationNumber} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {app.applicationNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{app.clientName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${channelBadgeClass(app.channel)}`}
                          >
                            {app.channelLabel}
                          </span>
                          {app.channel === 'admin' && (
                            <p className="mt-1 text-xs text-slate-500">{app.performerName}</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{app.insuranceCategory}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <MotorApplicationStatusBadge status={app.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {app.submittedAt ? formatDateUTC(app.submittedAt) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900">
                          {formatRwf(app.companyCommission)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex flex-nowrap items-center gap-2">
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="inline-flex items-center gap-1"
                                onClick={() => setEditingApplication(app.application)}
                              >
                                <PencilLine className="h-4 w-4" aria-hidden />
                                Edit
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="text"
                              className="inline-flex items-center gap-1"
                              onClick={() => setViewingApplication(app.application)}
                            >
                              <Eye className="h-4 w-4" aria-hidden />
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
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
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <MotorApplicationDetailsModal
        application={viewingApplication}
        onClose={() => setViewingApplication(null)}
      />

      {canEdit && (
        <MotorApplicationEditModal
          application={editingApplication}
          token={token}
          onClose={() => setEditingApplication(null)}
          onSaved={() => void loadData()}
        />
      )}
    </MainLayout>
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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-2.5">
          <Icon className="h-5 w-5 text-blue-700" aria-hidden />
        </div>
      </div>
    </div>
  );
}
