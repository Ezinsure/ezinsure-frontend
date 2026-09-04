'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Download,
  Loader2,
  Search,
  Upload,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataExportActions } from '@/components/ui/data-export-actions';
import { useToast } from '@/components/ui/toast';
import { useExternalVetCommissionsApi } from './api';
import {
  formatRwf,
  type ExternalVetCommissionBatch,
  type ExternalVetCommissionBatchSummary,
  type ExternalVetCommissionStatus,
  type ExternalVetPerformanceRow,
  type ExternalVetsOverviewStats,
  type ExternalVetsHubTab,
  type ExternalVetsViewRole,
} from './domain';
import { BatchDetailPanel } from './components/batch-detail-panel';
import { BatchListTable } from './components/batch-list-table';
import { CommissionLinesPanel } from './components/commission-lines-panel';
import { UploadCommissionWizard } from './components/upload-commission-wizard';
import { getMonthToDateRange } from './date-range';
import { downloadExternalVetCommissionTemplate } from './export/commission-sheet-template';
import {
  batchCreatedInDateRange,
  exportExternalVetBatchesToExcel,
  exportExternalVetBatchesToPdf,
} from './export/batch-list-export';

const TAB_DEFS: {
  id: ExternalVetsHubTab;
  label: string;
  roles: ExternalVetsViewRole[];
}[] = [
  { id: 'overview', label: 'Overview', roles: ['admin', 'super_admin', 'finance'] },
  {
    id: 'applications',
    label: 'Applications',
    roles: ['admin', 'super_admin', 'finance'],
  },
  {
    id: 'admin-review',
    label: 'Admin Review',
    roles: ['admin', 'super_admin'],
  },
  { id: 'payments', label: 'Payments', roles: ['finance'] },
  { id: 'initiated', label: 'Initiated', roles: ['finance'] },
  {
    id: 'lines',
    label: 'Lines',
    roles: ['admin', 'super_admin', 'finance'],
  },
  {
    id: 'history',
    label: 'Paid / History',
    roles: ['admin', 'super_admin', 'finance'],
  },
];

function statusForTab(
  tab: ExternalVetsHubTab,
): ExternalVetCommissionStatus | 'ALL' | null {
  switch (tab) {
    case 'applications':
      return 'ALL';
    case 'admin-review':
      return 'PENDING_ADMIN_REVIEW';
    case 'payments':
      return 'READY_TO_BE_PAID';
    case 'initiated':
      return 'PAYMENT_INITIATED';
    case 'history':
      return 'PAID';
    case 'lines':
    case 'overview':
    default:
      return null;
  }
}

function canExportTab(tab: ExternalVetsHubTab): boolean {
  return (
    tab === 'applications' ||
    tab === 'admin-review' ||
    tab === 'payments' ||
    tab === 'initiated'
  );
}

export interface ExternalVetsHubProps {
  viewRole: ExternalVetsViewRole;
}

export default function ExternalVetsHub({ viewRole }: ExternalVetsHubProps) {
  const api = useExternalVetCommissionsApi();
  const { showToast, ToastContainer } = useToast();

  const visibleTabs = useMemo(
    () => TAB_DEFS.filter((t) => t.roles.includes(viewRole)),
    [viewRole],
  );
  const [tab, setTab] = useState<ExternalVetsHubTab>(
    () => TAB_DEFS.find((t) => t.roles.includes(viewRole))?.id ?? 'overview',
  );
  const [search, setSearch] = useState('');
  const monthRange = useMemo(() => getMonthToDateRange(), []);
  const [startDate, setStartDate] = useState(monthRange.startDate);
  const [endDate, setEndDate] = useState(monthRange.endDate);
  const [isLoading, setIsLoading] = useState(false);
  const [batches, setBatches] = useState<ExternalVetCommissionBatchSummary[]>([]);
  const [overview, setOverview] = useState<ExternalVetsOverviewStats | null>(null);
  const [performance, setPerformance] = useState<ExternalVetPerformanceRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<ExternalVetCommissionBatch | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [isExportingTemplate, setIsExportingTemplate] = useState(false);

  const canUpload = viewRole === 'admin' || viewRole === 'super_admin';
  const canReview = canUpload;
  const canPay = viewRole === 'finance';

  async function handleDownloadTemplate() {
    setIsExportingTemplate(true);
    try {
      await downloadExternalVetCommissionTemplate();
      showToast('Template downloaded', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to download template',
        'error',
      );
    } finally {
      setIsExportingTemplate(false);
    }
  }

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      if (tab === 'overview') {
        const [stats, perf] = await Promise.all([
          api.getOverview(),
          api.getPerformance(),
        ]);
        setOverview(stats);
        setPerformance(perf);
        setBatches([]);
      } else if (tab === 'lines') {
        setBatches([]);
      } else if (tab === 'history') {
        const range = {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };
        const historyStatuses: ExternalVetCommissionStatus[] = [
          'PAID',
          'AWAITING_SONARWA_REIMBURSEMENT',
          'REIMBURSED_BY_SONARWA',
        ];
        const lists = await Promise.all(
          historyStatuses.map(async (status) => {
            try {
              return await api.listBatches(status, range);
            } catch {
              return [] as ExternalVetCommissionBatchSummary[];
            }
          }),
        );
        const byId = new Map<string, ExternalVetCommissionBatchSummary>();
        for (const batch of lists.flat()) {
          byId.set(batch.id, batch);
        }
        setBatches(
          [...byId.values()].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
      } else {
        const status = statusForTab(tab);
        const list = await api.listBatches(status ?? 'ALL', {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        setBatches(list);
      }
      setSelectedIds(new Set());
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to load data',
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  }, [api, endDate, showToast, startDate, tab]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) {
      setTab(visibleTabs[0]?.id ?? 'overview');
    }
  }, [tab, visibleTabs]);

  const filteredBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((b) => {
      if (!batchCreatedInDateRange(b.createdAt, startDate || undefined, endDate || undefined)) {
        return false;
      }
      if (!q) return true;
      return (
        b.batchNumber.toLowerCase().includes(q) ||
        (b.payee?.name ?? '').toLowerCase().includes(q) ||
        (b.payee?.phoneNumber ?? '').includes(q) ||
        (b.periodLabel ?? '').toLowerCase().includes(q) ||
        b.sourceFileName.toLowerCase().includes(q)
      );
    });
  }, [batches, endDate, search, startDate]);

  const exportParams = useMemo(
    () => ({
      rows: filteredBatches,
      tab,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search || undefined,
    }),
    [endDate, filteredBatches, search, startDate, tab],
  );

  const handleExportExcel = useCallback(async () => {
    if (filteredBatches.length === 0) {
      showToast('No batches to export for the current filters', 'error');
      return;
    }
    try {
      await exportExternalVetBatchesToExcel(exportParams);
      showToast('Exported to Excel', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Excel export failed', 'error');
    }
  }, [exportParams, filteredBatches.length, showToast]);

  const handleExportPdf = useCallback(async () => {
    if (filteredBatches.length === 0) {
      showToast('No batches to export for the current filters', 'error');
      return;
    }
    try {
      await exportExternalVetBatchesToPdf(exportParams);
      showToast('Exported to PDF', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'PDF export failed', 'error');
    }
  }, [exportParams, filteredBatches.length, showToast]);

  async function openDetail(id: string) {
    const batch = await api.getBatch(id);
    if (!batch) {
      showToast('Batch not found', 'error');
      return;
    }
    setDetail(batch);
    setReviewNote(batch.reviewNote ?? '');
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (filteredBatches.every((b) => selectedIds.has(b.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBatches.map((b) => b.id)));
    }
  }

  async function handleApprove(id: string) {
    setActionBusy(true);
    try {
      await api.approveBatch(id, reviewNote || undefined);
      showToast('Batch approved — ready to be paid', 'success');
      setDetail(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Approve failed', 'error');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleReject(id: string) {
    if (!reviewNote.trim()) {
      showToast('Add a rejection note', 'error');
      return;
    }
    setActionBusy(true);
    try {
      await api.rejectBatch(id, reviewNote.trim());
      showToast('Batch rejected', 'success');
      setDetail(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reject failed', 'error');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleInitiate(ids: string[]) {
    if (!ids.length) return;
    setActionBusy(true);
    try {
      if (ids.length === 1) await api.initiatePayment(ids[0]);
      else await api.initiatePaymentBulk(ids);
      showToast('Payment initiated', 'success');
      setDetail(null);
      await reload();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Initiate payment failed',
        'error',
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleMarkPaid(ids: string[]) {
    if (!ids.length) return;
    setActionBusy(true);
    try {
      if (ids.length === 1) await api.markPaid(ids[0]);
      else await api.markPaidBulk(ids);
      showToast('Marked as paid', 'success');
      setDetail(null);
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Mark paid failed', 'error');
    } finally {
      setActionBusy(false);
    }
  }

  const detailFooter =
    detail && canReview && detail.status === 'PENDING_ADMIN_REVIEW' ? (
      <div className="space-y-3">
        <textarea
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={2}
          placeholder="Review note (required for reject)"
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void handleApprove(detail.id)}
            disabled={actionBusy}
          >
            {actionBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Approve
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleReject(detail.id)}
            disabled={actionBusy}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>
      </div>
    ) : detail && canPay && detail.status === 'READY_TO_BE_PAID' ? (
      <Button
        onClick={() => void handleInitiate([detail.id])}
        disabled={actionBusy}
      >
        {actionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Initiate payment
      </Button>
    ) : detail && canPay && detail.status === 'PAYMENT_INITIATED' ? (
      <Button
        onClick={() => void handleMarkPaid([detail.id])}
        disabled={actionBusy}
      >
        {actionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Mark as paid
      </Button>
    ) : null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <ToastContainer />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">External Vets</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track SONARWA commission sheets for vets who do not use ezInsure —
            separate from normal livestock applications.
          </p>
        </div>
        {canUpload && tab === 'applications' ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void handleDownloadTemplate()}
              disabled={isExportingTemplate}
            >
              {isExportingTemplate ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export template
            </Button>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              New batch
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setSearch('');
            }}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <OverviewSection
          overview={overview}
          performance={performance}
          isLoading={isLoading}
        />
      ) : tab === 'lines' ? (
        <CommissionLinesPanel canMutate={canPay} />
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  From
                </span>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </label>
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  To
                </span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <Search className="h-3.5 w-3.5" aria-hidden />
                  Search
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
                    placeholder="Search batch, vet, phone, file…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </label>
            </div>
            {(startDate || endDate) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  Created: {startDate || '…'} → {endDate || '…'}
                </span>
                <button
                  type="button"
                  className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
                  onClick={() => {
                    const range = getMonthToDateRange();
                    setStartDate(range.startDate);
                    setEndDate(range.endDate);
                  }}
                >
                  Reset to this month
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {filteredBatches.length} batch
              {filteredBatches.length === 1 ? '' : 'es'}
              {startDate || endDate || search ? ' matching filters' : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {canExportTab(tab) ? (
                <DataExportActions
                  disabled={isLoading || filteredBatches.length === 0}
                  onExportExcel={handleExportExcel}
                  onExportPdf={handleExportPdf}
                />
              ) : null}
              {canPay && tab === 'payments' && selectedIds.size > 0 ? (
                <Button
                  onClick={() => void handleInitiate([...selectedIds])}
                  disabled={actionBusy}
                >
                  Initiate selected ({selectedIds.size})
                </Button>
              ) : null}
              {canPay && tab === 'initiated' && selectedIds.size > 0 ? (
                <Button
                  onClick={() => void handleMarkPaid([...selectedIds])}
                  disabled={actionBusy}
                >
                  Mark selected paid ({selectedIds.size})
                </Button>
              ) : null}
            </div>
          </div>

          <BatchListTable
            batches={filteredBatches}
            isLoading={isLoading}
            emptyMessage={
              tab === 'admin-review'
                ? 'No batches pending admin review.'
                : tab === 'payments'
                  ? 'No batches ready to be paid.'
                  : tab === 'initiated'
                    ? 'No initiated payments.'
                    : tab === 'history'
                      ? 'No paid or reimbursed batches yet.'
                      : 'No external vet commission batches yet.'
            }
            selectedIds={
              canPay && (tab === 'payments' || tab === 'initiated')
                ? selectedIds
                : undefined
            }
            onToggleSelect={
              canPay && (tab === 'payments' || tab === 'initiated')
                ? toggleSelect
                : undefined
            }
            onToggleSelectAll={
              canPay && (tab === 'payments' || tab === 'initiated')
                ? toggleSelectAll
                : undefined
            }
            onView={(id) => void openDetail(id)}
            rowActions={(batch) => {
              if (canReview && batch.status === 'PENDING_ADMIN_REVIEW') {
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void openDetail(batch.id)}
                  >
                    Review
                  </Button>
                );
              }
              if (canPay && batch.status === 'READY_TO_BE_PAID') {
                return (
                  <Button
                    size="sm"
                    onClick={() => void handleInitiate([batch.id])}
                    disabled={actionBusy}
                  >
                    Initiate
                  </Button>
                );
              }
              if (canPay && batch.status === 'PAYMENT_INITIATED') {
                return (
                  <Button
                    size="sm"
                    onClick={() => void handleMarkPaid([batch.id])}
                    disabled={actionBusy}
                  >
                    Mark paid
                  </Button>
                );
              }
              return null;
            }}
          />
        </div>
      )}

      {detail ? (
        <BatchDetailPanel
          batch={detail}
          onClose={() => setDetail(null)}
          footer={detailFooter}
        />
      ) : null}

      {canUpload ? (
        <UploadCommissionWizard
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onCreated={() => {
            showToast('Commission batch submitted for admin review', 'success');
            setTab('applications');
            void reload();
          }}
        />
      ) : null}
    </div>
  );
}

function OverviewSection({
  overview,
  performance,
  isLoading,
}: {
  overview: ExternalVetsOverviewStats | null;
  performance: ExternalVetPerformanceRow[];
  isLoading: boolean;
}) {
  if (isLoading || !overview) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading overview…
      </div>
    );
  }

  const cards = [
    {
      label: 'Pending review',
      count: overview.pendingReviewCount,
      amount: overview.pendingReviewCommission,
    },
    {
      label: 'Ready to pay',
      count: overview.readyToPayCount,
      amount: overview.readyToPayCommission,
    },
    {
      label: 'Payment initiated',
      count: overview.initiatedCount,
      amount: overview.initiatedCommission,
    },
    {
      label: 'Paid YTD',
      count: overview.paidYtdCount,
      amount: overview.paidYtdCommission,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {card.count}
            </p>
            <p className="mt-1 text-sm text-slate-600">{formatRwf(card.amount)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            External vet performance
          </h2>
          <span className="text-xs text-slate-500">
            {overview.externalVetCount} registered
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2 font-medium">Vet</th>
                <th className="px-2 py-2 font-medium">Batches</th>
                <th className="px-2 py-2 font-medium">Pending</th>
                <th className="px-2 py-2 font-medium">In pipeline</th>
                <th className="px-2 py-2 font-medium">Paid</th>
                <th className="px-2 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((row) => (
                <tr key={row.externalVetId} className="border-t border-slate-100">
                  <td className="px-2 py-2">
                    <div className="font-medium text-slate-900">{row.name}</div>
                    <div className="text-xs text-slate-500">{row.phoneNumber}</div>
                  </td>
                  <td className="px-2 py-2">{row.batchCount}</td>
                  <td className="px-2 py-2">{formatRwf(row.pendingCommission)}</td>
                  <td className="px-2 py-2">{formatRwf(row.readyCommission)}</td>
                  <td className="px-2 py-2">{formatRwf(row.paidCommission)}</td>
                  <td className="px-2 py-2 font-medium">
                    {formatRwf(row.totalCommission)}
                  </td>
                </tr>
              ))}
              {!performance.length ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-2 py-8 text-center text-slate-500"
                  >
                    No external vets yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
