'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  Download,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataExportActions } from '@/components/ui/data-export-actions';
import { useToast } from '@/components/ui/toast';
import { useExternalVetCommissionsApi } from './api';
import {
  COMMISSION_REQUESTS_PRODUCT_NAME,
  COMMISSION_REQUESTS_PRODUCT_SUBTITLE,
  formatRwf,
  type ExternalVetCommissionBatch,
  type ExternalVetCommissionBatchSummary,
  type ExternalVetCommissionStatus,
  type ExternalVetPerformanceRow,
  type ExternalVetsOverviewStats,
  type ExternalVetsHubTab,
  type ExternalVetsViewRole,
} from './domain';
import {
  areAllLinesRejected,
  canApproveBatchForPayment,
  canSendBatchToAdminReview,
  canSubmitDraftBatch,
  countLinesMissingStageReview,
  isBatchFullyReviewed,
  reviewStageForViewRole,
} from './line-review';
import { useAuth } from '@/context/AuthContext';
import { BatchDetailPanel } from './components/batch-detail-panel';
import { BatchListTable } from './components/batch-list-table';
import { ClaimsFunnel, type ClaimsFunnelStage } from './components/claims-funnel';
import { CommissionLinesPanel } from './components/commission-lines-panel';
import { UploadCommissionWizard } from './components/upload-commission-wizard';
import { WorkbenchDateFilters } from './components/workbench-date-filters';
import type { ClaimFormLanguage } from './commission-sheet-schema';
import { getMonthToDateRange } from './date-range';
import { downloadCommissionClaimForm } from './export/commission-sheet-template';
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
  {
    id: 'overview',
    label: 'Overview',
    roles: ['admin', 'super_admin', 'finance', 'sonarwa'],
  },
  {
    id: 'applications',
    label: 'Requests',
    roles: ['admin', 'super_admin', 'finance', 'sonarwa', 'vet'],
  },
  {
    id: 'sonarwa-review',
    label: 'SONARWA Review',
    roles: ['sonarwa', 'admin', 'super_admin'],
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
    roles: ['admin', 'super_admin', 'finance', 'sonarwa', 'vet'],
  },
];

function statusForTab(
  tab: ExternalVetsHubTab,
): ExternalVetCommissionStatus | 'ALL' | null {
  switch (tab) {
    case 'applications':
      return 'ALL';
    case 'sonarwa-review':
      return 'PENDING_SONARWA_REVIEW';
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
    tab === 'sonarwa-review' ||
    tab === 'admin-review' ||
    tab === 'payments' ||
    tab === 'initiated'
  );
}

function parseHubTab(
  value: string | null,
  allowed: ExternalVetsHubTab[],
): ExternalVetsHubTab | null {
  if (!value) return null;
  return allowed.includes(value as ExternalVetsHubTab)
    ? (value as ExternalVetsHubTab)
    : null;
}

export interface ExternalVetsHubProps {
  viewRole: ExternalVetsViewRole;
}

export default function ExternalVetsHub({ viewRole }: ExternalVetsHubProps) {
  const api = useExternalVetCommissionsApi();
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const visibleTabs = useMemo(
    () => TAB_DEFS.filter((t) => t.roles.includes(viewRole)),
    [viewRole],
  );
  const visibleTabIds = useMemo(
    () => visibleTabs.map((t) => t.id),
    [visibleTabs],
  );
  const reviewStage = useMemo(
    () => reviewStageForViewRole(viewRole),
    [viewRole],
  );
  const [tab, setTabState] = useState<ExternalVetsHubTab>(() => {
    const fromUrl = parseHubTab(
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('tab')
        : null,
      TAB_DEFS.filter((t) => t.roles.includes(viewRole)).map((t) => t.id),
    );
    return (
      fromUrl ??
      TAB_DEFS.find((t) => t.roles.includes(viewRole))?.id ??
      'overview'
    );
  });

  const setTab = useCallback(
    (next: ExternalVetsHubTab) => {
      setTabState(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === (visibleTabIds[0] ?? 'overview')) {
        params.delete('tab');
      } else {
        params.set('tab', next);
      }
      const query = params.toString();
      router.replace(query ? `?${query}` : '?', { scroll: false });
    },
    [router, searchParams, visibleTabIds],
  );

  useEffect(() => {
    const fromUrl = parseHubTab(searchParams.get('tab'), visibleTabIds);
    const fallback = visibleTabIds[0] ?? 'overview';
    const next = fromUrl ?? fallback;
    if (next !== tab) {
      setTabState(next);
    }
  }, [searchParams, tab, visibleTabIds]);
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
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [templateBusy, setTemplateBusy] = useState<ClaimFormLanguage | null>(
    null,
  );

  const canUpload =
    viewRole === 'admin' ||
    viewRole === 'super_admin' ||
    viewRole === 'vet';
  const canReview = viewRole === 'admin' || viewRole === 'super_admin';
  const canPay = viewRole === 'finance';
  const isSonarwa = viewRole === 'sonarwa';
  const isVet = viewRole === 'vet';
  const canLineReview = canReview || canPay || isSonarwa;

  async function handleDownloadTemplate(language: ClaimFormLanguage) {
    setTemplateBusy(language);
    try {
      await downloadCommissionClaimForm(language);
      showToast('Request form downloaded', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to download request form',
        'error',
      );
    } finally {
      setTemplateBusy(null);
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
        let enriched = stats;
        if (
          stats.draftCount == null ||
          stats.pendingSonarwaCount == null
        ) {
          try {
            const [drafts, sonarwa] = await Promise.all([
              api.listBatches('DRAFT'),
              api.listBatches('PENDING_SONARWA_REVIEW'),
            ]);
            enriched = {
              ...stats,
              draftCount: stats.draftCount ?? drafts.length,
              draftCommission:
                stats.draftCommission ??
                drafts.reduce((sum, b) => sum + (b.totalVetCommission || 0), 0),
              pendingSonarwaCount:
                stats.pendingSonarwaCount ?? sonarwa.length,
              pendingSonarwaCommission:
                stats.pendingSonarwaCommission ??
                sonarwa.reduce((sum, b) => sum + (b.totalVetCommission || 0), 0),
            };
          } catch {
            enriched = stats;
          }
        }
        setOverview(enriched);
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
              return await api.listBatches(status, {
                ...range,
                mine: isVet || undefined,
              });
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
          mine: isVet || undefined,
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
  }, [api, endDate, isVet, showToast, startDate, tab]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) {
      setTab(visibleTabs[0]?.id ?? 'overview');
    }
  }, [setTab, tab, visibleTabs]);

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
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    setReviewNote('');
    try {
      const batch = await api.getBatch(id);
      if (!batch) {
        showToast('Batch not found', 'error');
        setDetailOpen(false);
        return;
      }
      setDetail(batch);
      setReviewNote(batch.reviewNote ?? '');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to load batch',
        'error',
      );
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetailOpen(false);
    setDetail(null);
    setDetailLoading(false);
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

  async function handleSubmitDraft(id: string) {
    if (!detail || !canSubmitDraftBatch(detail)) {
      showToast('Only draft requests with lines can be submitted', 'error');
      return;
    }
    setActionBusy(true);
    try {
      const updated = await api.submitBatch(id, detail);
      setDetail(updated);
      showToast('Submitted for SONARWA review', 'success');
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Submit failed', 'error');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSendToAdmin(id: string) {
    if (!detail) return;
    if (!isBatchFullyReviewed(detail.lines)) {
      showToast('Review every line before sending to admin', 'error');
      return;
    }
    if (areAllLinesRejected(detail.lines)) {
      showToast(
        'All lines are rejected — reject the request instead',
        'error',
      );
      return;
    }
    if (!canSendBatchToAdminReview(detail)) {
      showToast('This request cannot be sent to admin yet', 'error');
      return;
    }
    setActionBusy(true);
    try {
      await api.sendToAdminReview(id, reviewNote || undefined, detail);
      showToast('Sent to ezInsure admin for review', 'success');
      closeDetail();
      await reload();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to send to admin',
        'error',
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleApprove(id: string) {
    if (!detail) return;
    if (!isBatchFullyReviewed(detail.lines)) {
      showToast(
        'Review every line before approving this request',
        'error',
      );
      return;
    }
    const missingAdmin = countLinesMissingStageReview(detail.lines, 'ADMIN');
    if (
      detail.lines.some((l) => (l.reviewEvents?.length ?? 0) > 0) &&
      missingAdmin > 0
    ) {
      showToast(
        `Confirm your admin decision on every line (${missingAdmin} still need an admin review)`,
        'error',
      );
      return;
    }
    if (areAllLinesRejected(detail.lines)) {
      showToast(
        'All lines are rejected — reject the request instead',
        'error',
      );
      return;
    }
    if (!canApproveBatchForPayment(detail)) {
      showToast('This request cannot be marked ready to pay yet', 'error');
      return;
    }
    setActionBusy(true);
    try {
      await api.approveBatch(id, reviewNote || undefined);
      showToast('Batch approved — ready to be paid', 'success');
      closeDetail();
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
      closeDetail();
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Reject failed', 'error');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleReviewLine(input: {
    lineId: string;
    decision: 'APPROVED' | 'REJECTED';
    reason?: string;
  }) {
    if (!detail || !reviewStage) return;
    setActionBusy(true);
    try {
      const updated = await api.reviewLine({
        batchId: detail.id,
        lineId: input.lineId,
        decision: input.decision,
        reason: input.reason,
        stage: reviewStage,
        actorId: user?._id,
        actorName: user?.fullName || 'Reviewer',
        actorRole: user?.role,
        currentBatch: detail,
      });
      setDetail(updated);
      showToast(
        input.decision === 'REJECTED' ? 'Line rejected' : 'Line approved',
        'success',
      );
      if (
        areAllLinesRejected(updated.lines) &&
        updated.status === 'PENDING_ADMIN_REVIEW'
      ) {
        showToast(
          'All lines are rejected — reject the request when ready',
          'error',
        );
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Line review failed',
        'error',
      );
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
      closeDetail();
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
      closeDetail();
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Mark paid failed', 'error');
    } finally {
      setActionBusy(false);
    }
  }

  const detailFooter =
    detail && canUpload && detail.status === 'DRAFT' ? (
      <div className="space-y-3">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          This request is still a draft. Submit it to start SONARWA line review.
        </p>
        <Button
          onClick={() => void handleSubmitDraft(detail.id)}
          disabled={actionBusy || !canSubmitDraftBatch(detail)}
          className="w-full sm:w-auto"
        >
          {actionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Submit for SONARWA review
        </Button>
      </div>
    ) : detail &&
      isSonarwa &&
      detail.status === 'PENDING_SONARWA_REVIEW' ? (
      <div className="space-y-3">
        {!isBatchFullyReviewed(detail.lines) ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Decide every line before sending this request to ezInsure admin.
            Pending:{' '}
            {
              detail.lines.filter((l) => l.lineStatus === 'PENDING_REVIEW')
                .length
            }
          </p>
        ) : areAllLinesRejected(detail.lines) ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            All lines are rejected. Reject the request — it cannot proceed
            to admin.
          </p>
        ) : (
          <p className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-950">
            All lines reviewed. Send to ezInsure admin for the next gate.
          </p>
        )}
        <textarea
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
          rows={2}
          placeholder="Review note (required for reject)"
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button
            onClick={() => void handleSendToAdmin(detail.id)}
            disabled={actionBusy || !canSendBatchToAdminReview(detail)}
            className="w-full sm:w-auto"
          >
            {actionBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Send to admin
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleReject(detail.id)}
            disabled={actionBusy}
            className="w-full sm:w-auto"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject request
          </Button>
        </div>
      </div>
    ) : detail && canReview && detail.status === 'PENDING_ADMIN_REVIEW' ? (
      <div className="space-y-3">
        {!isBatchFullyReviewed(detail.lines) ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Decide every line (approve or reject) before marking this
            request ready to pay. Pending:{' '}
            {
              detail.lines.filter((l) => l.lineStatus === 'PENDING_REVIEW')
                .length
            }
          </p>
        ) : countLinesMissingStageReview(detail.lines, 'ADMIN') > 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            SONARWA already decided some lines — you must still record an{' '}
            <strong>admin</strong> decision on every line. Remaining:{' '}
            {countLinesMissingStageReview(detail.lines, 'ADMIN')}
          </p>
        ) : areAllLinesRejected(detail.lines) ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            All lines are rejected. Reject the request — it cannot be marked
            ready to pay.
          </p>
        ) : (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            All lines have an admin decision. Approving will mark the request
            ready to pay using approved-line totals only.
          </p>
        )}
        <textarea
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
          rows={2}
          placeholder="Review note (required for reject)"
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button
            onClick={() => void handleApprove(detail.id)}
            disabled={actionBusy || !canApproveBatchForPayment(detail)}
            className="w-full sm:w-auto"
            title={
              canApproveBatchForPayment(detail)
                ? undefined
                : 'Finish admin line reviews first'
            }
          >
            {actionBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Mark ready to pay
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleReject(detail.id)}
            disabled={actionBusy}
            className="w-full sm:w-auto"
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject request
          </Button>
        </div>
      </div>
    ) : detail && canPay && detail.status === 'READY_TO_BE_PAID' ? (
      <Button
        onClick={() => void handleInitiate([detail.id])}
        disabled={actionBusy}
        className="w-full sm:w-auto"
      >
        {actionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Initiate payment
      </Button>
    ) : detail && canPay && detail.status === 'PAYMENT_INITIATED' ? (
      <Button
        onClick={() => void handleMarkPaid([detail.id])}
        disabled={actionBusy}
        className="w-full sm:w-auto"
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
          <h1 className="text-2xl font-semibold text-slate-900">
            {COMMISSION_REQUESTS_PRODUCT_NAME}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {COMMISSION_REQUESTS_PRODUCT_SUBTITLE}
          </p>
        </div>
        {canUpload && tab === 'applications' ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void handleDownloadTemplate('rw')}
              disabled={templateBusy != null}
            >
              {templateBusy === 'rw' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Request form (Kinyarwanda)
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleDownloadTemplate('en')}
              disabled={templateBusy != null}
            >
              {templateBusy === 'en' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Request form (English)
            </Button>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              New batch
            </Button>
          </div>
        ) : null}
      </div>

      <div
        className="flex flex-wrap gap-1 border-b border-slate-200"
        role="tablist"
        aria-label="Commission requests sections"
      >
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`claims-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`claims-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => {
              setTab(t.id);
              setSearch('');
            }}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 ${
              tab === t.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {isVet && t.id === 'applications' ? 'My Requests' : t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`claims-panel-${tab}`}
        aria-labelledby={`claims-tab-${tab}`}
      >
      {tab === 'overview' ? (
        <OverviewSection
          overview={overview}
          performance={performance}
          isLoading={isLoading}
          onSelectTab={setTab}
        />
      ) : tab === 'lines' ? (
        <CommissionLinesPanel
          canMutate={canPay}
          viewRole={viewRole}
          canReviewLines={canLineReview}
        />
      ) : (
        <div className="space-y-4">
          <WorkbenchDateFilters
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search batch, vet, phone, file…"
            onResetToMonth={() => {
              const range = getMonthToDateRange();
              setStartDate(range.startDate);
              setEndDate(range.endDate);
            }}
          />

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
              tab === 'sonarwa-review'
                ? 'No requests pending SONARWA review.'
                : tab === 'admin-review'
                  ? 'No requests pending admin review.'
                  : tab === 'payments'
                    ? 'No requests ready to be paid.'
                    : tab === 'initiated'
                      ? 'No initiated payments.'
                      : tab === 'history'
                        ? 'No paid or reimbursed requests yet.'
                        : 'No commission requests yet.'
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
              if (
                isSonarwa &&
                batch.status === 'PENDING_SONARWA_REVIEW'
              ) {
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void openDetail(batch.id)}
                  >
                    Review lines
                  </Button>
                );
              }
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
              if (canUpload && batch.status === 'DRAFT') {
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void openDetail(batch.id)}
                  >
                    Submit
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
      </div>

      {detailOpen ? (
        <BatchDetailPanel
          batch={detail}
          isLoading={detailLoading}
          onClose={closeDetail}
          footer={detailFooter}
          reviewStage={canLineReview ? reviewStage : null}
          reviewBusy={actionBusy}
          onReviewLine={
            canLineReview ? (input) => handleReviewLine(input) : undefined
          }
        />
      ) : null}

      {canUpload ? (
        <UploadCommissionWizard
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onCreated={() => {
            setTab('applications');
            void reload();
          }}
          selfServiceProfile={
            isVet && user
              ? {
                  userId: user._id,
                  fullName: user.fullName,
                  phoneNumber: user.phoneNumber,
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

function OverviewSection({
  overview,
  performance,
  isLoading,
  onSelectTab,
}: {
  overview: ExternalVetsOverviewStats | null;
  performance: ExternalVetPerformanceRow[];
  isLoading: boolean;
  onSelectTab?: (tab: ExternalVetsHubTab) => void;
}) {
  if (isLoading || !overview) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading overview…
      </div>
    );
  }

  const funnelStages: ClaimsFunnelStage[] = [
    {
      id: 'draft',
      label: 'Draft',
      count: overview.draftCount ?? 0,
      amount: overview.draftCommission ?? 0,
      tab: 'applications',
      tone: 'slate',
    },
    {
      id: 'sonarwa',
      label: 'SONARWA',
      count: overview.pendingSonarwaCount ?? 0,
      amount: overview.pendingSonarwaCommission ?? 0,
      tab: 'sonarwa-review',
      tone: 'cyan',
    },
    {
      id: 'admin',
      label: 'Admin review',
      count: overview.pendingReviewCount,
      amount: overview.pendingReviewCommission,
      tab: 'admin-review',
      tone: 'amber',
    },
    {
      id: 'ready',
      label: 'Ready to pay',
      count: overview.readyToPayCount,
      amount: overview.readyToPayCommission,
      tab: 'payments',
      tone: 'emerald',
    },
    {
      id: 'initiated',
      label: 'Initiated',
      count: overview.initiatedCount,
      amount: overview.initiatedCommission,
      tab: 'initiated',
      tone: 'violet',
    },
    {
      id: 'paid',
      label: 'Paid YTD',
      count: overview.paidYtdCount,
      amount: overview.paidYtdCommission,
      tab: 'history',
      tone: 'blue',
    },
  ];

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
      <ClaimsFunnel
        stages={funnelStages}
        onSelectStage={(stage) => {
          if (stage.tab) onSelectTab?.(stage.tab);
        }}
      />

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
            Vet performance
          </h2>
          <span className="text-xs text-slate-500">
            {overview.externalVetCount} registered
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">
              Commission performance by veterinarian
            </caption>
            <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-2 py-2 font-medium">Vet</th>
                <th scope="col" className="px-2 py-2 font-medium">Batches</th>
                <th scope="col" className="px-2 py-2 font-medium">Pending</th>
                <th scope="col" className="px-2 py-2 font-medium">In pipeline</th>
                <th scope="col" className="px-2 py-2 font-medium">Paid</th>
                <th scope="col" className="px-2 py-2 font-medium">Total</th>
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
                    No registered vets yet.
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
