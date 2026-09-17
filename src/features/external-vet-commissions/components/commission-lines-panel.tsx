'use client';

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  Loader2,
  Search,
  Ban,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { useExternalVetCommissionsApi } from '../api';
import { getMonthToDateRange } from '../date-range';
import {
  EXTERNAL_VET_LINES_WORKSPACE_STATUSES,
  EXTERNAL_VET_STATUS_LABELS,
  canFinanceRejectBatchStatus,
  formatRwf,
  summarizeCommissionLines,
  type ExportLineIncludeFilter,
  type ExternalVetCommissionLineListItem,
  type ExternalVetCommissionStatus,
  type ExternalVetsViewRole,
  type ExternalVetLinesWorkspaceStatus,
} from '../domain';
import {
  canReviewLinesAtBatchStatus,
  reviewStageForViewRole,
} from '../line-review';
import { batchCreatedInDateRange } from '../export/batch-list-export';
import {
  exportExternalVetLinesToExcel,
  exportExternalVetLinesToPdf,
} from '../export/lines-export';
import { ExportIncludeDialog } from './export-include-dialog';
import { ExternalVetStatusBadge } from './status-badge';
import { LineDetailModal } from './line-detail-modal';
import { LineReviewDialog, type LineReviewDecision } from './line-review-dialog';
import { LineStatusBadge } from './line-status-badge';
import {
  FinanceRejectDialog,
  type FinanceRejectTarget,
} from './finance-reject-dialog';
import {
  ReimbursementConfirmDialog,
  type ReimbursementConfirmMode,
} from './reimbursement-confirm-dialog';

const GROUPS_PER_PAGE = 8;

const STATUS_OVERVIEW_CARDS = [
  {
    key: 'ready',
    label: 'Ready to pay',
    status: 'READY_TO_BE_PAID' as const,
    tone: 'border-sky-200 bg-sky-50/60',
  },
  {
    key: 'initiated',
    label: 'Initiated',
    status: 'PAYMENT_INITIATED' as const,
    tone: 'border-violet-200 bg-violet-50/60',
  },
  {
    key: 'paid',
    label: 'Paid',
    status: 'PAID' as const,
    tone: 'border-emerald-200 bg-emerald-50/60',
  },
  {
    key: 'awaiting',
    label: 'Awaiting reimbursement',
    status: 'AWAITING_SONARWA_REIMBURSEMENT' as const,
    tone: 'border-orange-200 bg-orange-50/60',
  },
  {
    key: 'reimbursed',
    label: 'Reimbursed',
    status: 'REIMBURSED_BY_SONARWA' as const,
    tone: 'border-teal-200 bg-teal-50/60',
  },
] as const;

type VetGroup = {
  externalVetId: string;
  payeeName: string;
  phoneNumber: string;
  bankName?: string;
  bankAccountNumber?: string;
  lines: ExternalVetCommissionLineListItem[];
  totalVetCommission: number;
  totalCompanyCommission: number;
  batchCount: number;
};

function groupLinesByVet(
  lines: ExternalVetCommissionLineListItem[],
): VetGroup[] {
  const map = new Map<string, VetGroup>();
  for (const line of lines) {
    const key = line.externalVetId || line.payee?.name || 'unknown';
    let group = map.get(key);
    if (!group) {
      group = {
        externalVetId: key,
        payeeName: line.payee?.name ?? '—',
        phoneNumber: line.payee?.phoneNumber ?? '',
        bankName: line.payee?.bankName,
        bankAccountNumber: line.payee?.bankAccountNumber,
        lines: [],
        totalVetCommission: 0,
        totalCompanyCommission: 0,
        batchCount: 0,
      };
      map.set(key, group);
    }
    group.lines.push(line);
    group.totalVetCommission += line.vetCommission || 0;
    group.totalCompanyCommission += line.companyCommission || 0;
  }
  for (const group of map.values()) {
    group.batchCount = new Set(group.lines.map((l) => l.batchId)).size;
  }
  return [...map.values()].sort((a, b) =>
    a.payeeName.localeCompare(b.payeeName, undefined, { sensitivity: 'base' }),
  );
}

function selectionTriState(
  ids: string[],
  selected: Set<string>,
): 'none' | 'some' | 'all' {
  if (!ids.length) return 'none';
  const count = ids.filter((id) => selected.has(id)).length;
  if (count === 0) return 'none';
  if (count === ids.length) return 'all';
  return 'some';
}

export type CommissionLinesPanelProps = {
  /** Finance can change reclaim statuses; admin/super_admin are read-only for reclaim. */
  canMutate?: boolean;
  /** Used to stamp line review events (admin / finance / sonarwa). */
  viewRole?: ExternalVetsViewRole;
  /** When false, hide line approve/reject even if viewRole maps to a stage. */
  canReviewLines?: boolean;
};

export function CommissionLinesPanel({
  canMutate = false,
  viewRole = 'finance',
  canReviewLines = true,
}: CommissionLinesPanelProps) {
  const api = useExternalVetCommissionsApi();
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const monthRange = useMemo(() => getMonthToDateRange(), []);
  const reviewStage = useMemo(
    () => reviewStageForViewRole(viewRole),
    [viewRole],
  );

  const [statusFilter, setStatusFilter] = useState<
    ExternalVetLinesWorkspaceStatus | 'ALL'
  >('PAID');
  const [startDate, setStartDate] = useState(monthRange.startDate);
  const [endDate, setEndDate] = useState(monthRange.endDate);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [, startFilterTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [lines, setLines] = useState<ExternalVetCommissionLineListItem[]>([]);
  const [rejectTarget, setRejectTarget] = useState<FinanceRejectTarget | null>(
    null,
  );
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(
    new Set(),
  );
  const [collapsedVets, setCollapsedVets] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [detailLine, setDetailLine] =
    useState<ExternalVetCommissionLineListItem | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmMode, setConfirmMode] =
    useState<ReimbursementConfirmMode | null>(null);
  const [exportReference, setExportReference] = useState('');
  const [reimbursedAt, setReimbursedAt] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [reimbursementReference, setReimbursementReference] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [bulkDecision, setBulkDecision] = useState<LineReviewDecision | null>(
    null,
  );

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load the full Lines workspace set so status overview cards stay accurate.
      const result = await api.listLines({
        status: 'ALL',
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      const workspaceLines = result.lines.filter((line) =>
        (EXTERNAL_VET_LINES_WORKSPACE_STATUSES as readonly string[]).includes(
          line.batchStatus,
        ),
      );
      setLines(workspaceLines);
      setSelectedLineIds(new Set());
      setPage(1);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to load commission lines',
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  }, [api, endDate, showToast, startDate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredLines = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return lines.filter((line) => {
      if (statusFilter !== 'ALL' && line.batchStatus !== statusFilter) {
        return false;
      }
      if (
        !batchCreatedInDateRange(
          line.batchCreatedAt,
          startDate || undefined,
          endDate || undefined,
        )
      ) {
        return false;
      }
      if (!q) return true;
      return (
        line.batchNumber.toLowerCase().includes(q) ||
        (line.payee?.name ?? '').toLowerCase().includes(q) ||
        (line.payee?.phoneNumber ?? '').includes(q) ||
        (line.contract ?? '').toLowerCase().includes(q) ||
        (line.clientName ?? '').toLowerCase().includes(q) ||
        (line.clientId ?? '').toLowerCase().includes(q) ||
        (line.branch ?? '').toLowerCase().includes(q) ||
        (line.periodLabel ?? '').toLowerCase().includes(q)
      );
    });
  }, [deferredSearch, endDate, lines, startDate, statusFilter]);

  const statusOverview = useMemo(() => {
    const inRange = lines.filter((line) =>
      batchCreatedInDateRange(
        line.batchCreatedAt,
        startDate || undefined,
        endDate || undefined,
      ),
    );
    const byStatus = (status: ExternalVetLinesWorkspaceStatus) =>
      summarizeCommissionLines(
        inRange.filter((l) => l.batchStatus === status),
      );
    return {
      ready: byStatus('READY_TO_BE_PAID'),
      initiated: byStatus('PAYMENT_INITIATED'),
      paid: byStatus('PAID'),
      awaiting: byStatus('AWAITING_SONARWA_REIMBURSEMENT'),
      reimbursed: byStatus('REIMBURSED_BY_SONARWA'),
    };
  }, [endDate, lines, startDate]);

  /** First line index per batch within the current filtered set — for one Reject CTA per batch. */
  const firstLineIdByBatch = useMemo(() => {
    const map = new Map<string, string>();
    for (const line of filteredLines) {
      if (!map.has(line.batchId)) map.set(line.batchId, line.id);
    }
    return map;
  }, [filteredLines]);

  const linesByBatchId = useMemo(() => {
    const map = new Map<string, ExternalVetCommissionLineListItem[]>();
    for (const line of lines) {
      const list = map.get(line.batchId);
      if (list) list.push(line);
      else map.set(line.batchId, [line]);
    }
    return map;
  }, [lines]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, startDate, endDate]);

  const summary = useMemo(
    () => summarizeCommissionLines(filteredLines),
    [filteredLines],
  );

  const groups = useMemo(
    () => groupLinesByVet(filteredLines),
    [filteredLines],
  );

  const totalPages = Math.max(1, Math.ceil(groups.length / GROUPS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedGroups = useMemo(() => {
    const start = (safePage - 1) * GROUPS_PER_PAGE;
    return groups.slice(start, start + GROUPS_PER_PAGE);
  }, [groups, safePage]);

  const selectedLines = useMemo(
    () => filteredLines.filter((line) => selectedLineIds.has(line.id)),
    [filteredLines, selectedLineIds],
  );

  const reviewableSelectedLines = useMemo(() => {
    if (!reviewStage) return [];
    return selectedLines.filter((line) =>
      canReviewLinesAtBatchStatus(reviewStage, line.batchStatus),
    );
  }, [reviewStage, selectedLines]);

  const canBulkReviewLines =
    canReviewLines &&
    Boolean(reviewStage) &&
    reviewableSelectedLines.length > 0;

  const selectedSummary = useMemo(
    () => summarizeCommissionLines(selectedLines),
    [selectedLines],
  );

  const selectedStatuses = useMemo(() => {
    const statuses = new Set(selectedLines.map((l) => l.batchStatus));
    return statuses;
  }, [selectedLines]);

  const canPrepareReclaim =
    canMutate &&
    selectedLines.length > 0 &&
    [...selectedStatuses].every((s) => s === 'PAID');

  const canMarkReimbursed =
    canMutate &&
    selectedLines.length > 0 &&
    [...selectedStatuses].every((s) => s === 'AWAITING_SONARWA_REIMBURSEMENT');

  const exportRows = selectedLines.length > 0 ? selectedLines : filteredLines;

  const allFilteredIds = useMemo(
    () => filteredLines.map((l) => l.id),
    [filteredLines],
  );

  const allTri = selectionTriState(allFilteredIds, selectedLineIds);

  function toggleLine(id: string) {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setGroupSelection(group: VetGroup, select: boolean) {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      for (const line of group.lines) {
        if (select) next.add(line.id);
        else next.delete(line.id);
      }
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    if (allTri === 'all') {
      setSelectedLineIds(new Set());
    } else {
      setSelectedLineIds(new Set(allFilteredIds));
    }
  }

  function toggleCollapse(vetId: string) {
    setCollapsedVets((prev) => {
      const next = new Set(prev);
      if (next.has(vetId)) next.delete(vetId);
      else next.add(vetId);
      return next;
    });
  }

  const runLinesExport = useCallback(
    async (
      kind: 'excel' | 'pdf',
      rows: ExternalVetCommissionLineListItem[],
      include: ExportLineIncludeFilter,
    ) => {
      const params = {
        rows,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter,
        search: search || undefined,
        purpose: 'review' as const,
      };
      if (kind === 'excel') {
        await exportExternalVetLinesToExcel(params);
        showToast(
          `Exported ${rows.length} ${include === 'ALL' ? '' : `${include.toLowerCase().replace('_', ' ')} `}line${rows.length === 1 ? '' : 's'} to Excel`,
          'success',
        );
      } else {
        await exportExternalVetLinesToPdf(params);
        showToast(
          `Exported ${rows.length} line${rows.length === 1 ? '' : 's'} to PDF`,
          'success',
        );
      }
    },
    [endDate, search, showToast, startDate, statusFilter],
  );

  async function applyLineReviews(
    targetLines: ExternalVetCommissionLineListItem[],
    decision: LineReviewDecision,
    reason?: string,
  ) {
    if (!reviewStage || !targetLines.length) return;
    if (decision === 'REJECTED' && !reason?.trim()) {
      showToast('A rejection reason is required', 'error');
      return;
    }

    setActionBusy(true);
    try {
      const byBatch = new Map<string, string[]>();
      for (const line of targetLines) {
        const list = byBatch.get(line.batchId) ?? [];
        list.push(line.id);
        byBatch.set(line.batchId, list);
      }

      const patched = new Map<string, ExternalVetCommissionLineListItem>();

      for (const [batchId, lineIds] of byBatch) {
        const updated = await api.bulkReviewLines({
          batchId,
          lineIds,
          decision,
          reason,
          stage: reviewStage,
          actorId: user?._id,
          actorName: user?.fullName || 'Reviewer',
          actorRole: user?.role,
        });
        for (const line of updated.lines) {
          if (!lineIds.includes(line.id)) continue;
          const previous = targetLines.find((t) => t.id === line.id);
          if (!previous) continue;
          patched.set(line.id, {
            ...previous,
            lineStatus: line.lineStatus,
            reviewEvents: line.reviewEvents,
            vetCommission: line.vetCommission,
            companyCommission: line.companyCommission,
          });
        }
      }

      setLines((prev) =>
        prev.map((line) => patched.get(line.id) ?? line),
      );
      if (detailLine) {
        const next = patched.get(detailLine.id);
        if (next) setDetailLine(next);
      }

      showToast(
        decision === 'REJECTED'
          ? `Rejected ${targetLines.length} line${targetLines.length === 1 ? '' : 's'}`
          : `Approved ${targetLines.length} line${targetLines.length === 1 ? '' : 's'}`,
        'success',
      );
      setBulkDecision(null);
      setSelectedLineIds(new Set());
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Line review failed',
        'error',
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmPrepareReclaim() {
    const batchIds = [...new Set(selectedLines.map((l) => l.batchId))];
    if (!batchIds.length) return;

    setActionBusy(true);
    try {
      await api.markAwaitingSonarwaReimbursement({
        batchIds,
        exportReference: exportReference || undefined,
      });
      await exportExternalVetLinesToExcel({
        rows: selectedLines,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: 'PAID',
        search: search || undefined,
        purpose: 'reclaim',
      });
      showToast(
        `Prepared reclaim for ${batchIds.length} batch${batchIds.length === 1 ? '' : 'es'} — Excel downloaded`,
        'success',
      );
      setConfirmMode(null);
      setExportReference('');
      await reload();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to prepare SONARWA reclaim',
        'error',
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmMarkReimbursed() {
    const batchIds = [...new Set(selectedLines.map((l) => l.batchId))];
    if (!batchIds.length) return;
    if (!reimbursementReference.trim()) {
      showToast('SONARWA transaction ID is required', 'error');
      return;
    }

    setActionBusy(true);
    try {
      await api.markReimbursedBySonarwa({
        batchIds,
        reimbursedAt: reimbursedAt || undefined,
        reimbursementReference: reimbursementReference.trim(),
      });
      showToast(
        `Marked ${batchIds.length} batch${batchIds.length === 1 ? '' : 'es'} reimbursed by SONARWA`,
        'success',
      );
      setConfirmMode(null);
      setReimbursementReference('');
      await reload();
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : 'Failed to mark reimbursed by SONARWA',
        'error',
      );
    } finally {
      setActionBusy(false);
    }
  }

  function openRejectForLine(line: ExternalVetCommissionLineListItem) {
    if (!canMutate || !canFinanceRejectBatchStatus(line.batchStatus)) return;
    const batchLines = linesByBatchId.get(line.batchId) ?? [line];
    setRejectTarget({
      batchId: line.batchId,
      batchNumber: line.batchNumber,
      status: line.batchStatus,
      payeeName: line.payee?.name || '—',
      periodLabel: line.periodLabel,
      lineCount: batchLines.length,
      totalVetCommission: batchLines.reduce(
        (sum, row) => sum + (row.vetCommission || 0),
        0,
      ),
      totalCompanyCommission: batchLines.reduce(
        (sum, row) => sum + (row.companyCommission || 0),
        0,
      ),
    });
  }

  async function confirmFinanceReject(reason: string) {
    if (!rejectTarget) return;
    setActionBusy(true);
    try {
      await api.rejectBatch(rejectTarget.batchId, reason);
      showToast(
        `Batch ${rejectTarget.batchNumber} rejected`,
        'success',
      );
      setRejectTarget(null);
      await reload();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to reject batch',
        'error',
      );
    } finally {
      setActionBusy(false);
    }
  }

  function resetToThisMonth() {
    const range = getMonthToDateRange();
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  function applyStatusFilter(next: ExternalVetLinesWorkspaceStatus | 'ALL') {
    startFilterTransition(() => {
      setStatusFilter(next);
    });
  }

  return (
    <div className="space-y-4">
      <ToastContainer />

      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-slate-700" aria-hidden />
              <h2 className="text-base font-semibold text-slate-900">
                {canMutate
                  ? 'SONARWA reclaim workspace'
                  : 'Commission lines'}
              </h2>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {canMutate
                ? 'Review Ready / Initiated lines, reject incomplete claims with a documented reason, then prepare SONARWA reclaim after payment and mark reimbursed once settled.'
                : 'Browse and export commission lines for verification. Select one or more vets to export only their lines. Double-click a row or use View for full details.'}
            </p>
          </div>
          {canMutate ? (
            <ol className="flex flex-wrap gap-2 text-xs">
              <li className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 font-medium text-sky-900">
                1. Ready to pay
              </li>
              <li className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 font-medium text-violet-900">
                2. Initiated
              </li>
              <li className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-900">
                3. Paid
              </li>
              <li className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 font-medium text-orange-900">
                4. Awaiting reimbursement
              </li>
              <li className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 font-medium text-teal-900">
                5. Reimbursed
              </li>
            </ol>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) =>
                applyStatusFilter(
                  e.target.value as ExternalVetLinesWorkspaceStatus | 'ALL',
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="READY_TO_BE_PAID">
                {EXTERNAL_VET_STATUS_LABELS.READY_TO_BE_PAID}
              </option>
              <option value="PAYMENT_INITIATED">
                {EXTERNAL_VET_STATUS_LABELS.PAYMENT_INITIATED}
              </option>
              <option value="PAID">{EXTERNAL_VET_STATUS_LABELS.PAID}</option>
              <option value="AWAITING_SONARWA_REIMBURSEMENT">
                {EXTERNAL_VET_STATUS_LABELS.AWAITING_SONARWA_REIMBURSEMENT}
              </option>
              <option value="REIMBURSED_BY_SONARWA">
                {EXTERNAL_VET_STATUS_LABELS.REIMBURSED_BY_SONARWA}
              </option>
              <option value="ALL">All line statuses</option>
            </select>
          </label>
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
          <label className="block">
            <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Search className="h-3.5 w-3.5" aria-hidden />
              Search
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
                placeholder="Vet, batch, contract, client…"
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
              onClick={resetToThisMonth}
            >
              Reset to this month
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {STATUS_OVERVIEW_CARDS.map((card) => {
          const data = statusOverview[card.key];
          const active = statusFilter === card.status;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => applyStatusFilter(card.status)}
              aria-pressed={active}
              className={`rounded-xl border px-4 py-3 text-left shadow-sm transition hover:ring-2 hover:ring-slate-200 ${card.tone} ${
                active ? 'ring-2 ring-slate-400' : ''
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {card.label}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {data.lineCount} lines · {data.batchCount} batches
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Total {formatRwf(data.totalCommission)} · VAT{' '}
                {formatRwf(data.vat)}
              </p>
              <p className="text-xs font-medium text-slate-800">
                Billable {formatRwf(data.billableToSonarwa)}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Filtered lines', value: String(summary.lineCount) },
          { label: 'Total commission', value: formatRwf(summary.totalCommission) },
          { label: 'VAT (18%)', value: formatRwf(summary.vat) },
          {
            label: 'Billable to SONARWA',
            value: formatRwf(summary.billableToSonarwa),
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="sticky top-0 z-20 -mx-1 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={allTri === 'all'}
                ref={(el) => {
                  if (el) el.indeterminate = allTri === 'some';
                }}
                onChange={toggleSelectAllFiltered}
                disabled={!filteredLines.length}
                aria-label="Select all matching lines"
              />
              <span>
                {selectedLineIds.size > 0
                  ? `${selectedSummary.lineCount} lines · ${selectedSummary.batchCount} batches · billable ${formatRwf(selectedSummary.billableToSonarwa)}`
                  : `${filteredLines.length} line${filteredLines.length === 1 ? '' : 's'} matching filters`}
              </span>
            </label>
            {selectedLineIds.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>
                  Total {formatRwf(selectedSummary.totalCommission)} · VAT{' '}
                  {formatRwf(selectedSummary.vat)}
                </span>
                <button
                  type="button"
                  className="font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
                  onClick={() => setSelectedLineIds(new Set())}
                >
                  Clear selection
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              disabled={isLoading || exportRows.length === 0}
              onClick={() => setExportOpen(true)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export lines
            </Button>
            {canBulkReviewLines ? (
              <>
                <Button
                  variant="outline"
                  disabled={actionBusy}
                  onClick={() => setBulkDecision('APPROVED')}
                  className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve selected ({reviewableSelectedLines.length})
                </Button>
                <Button
                  variant="outline"
                  disabled={actionBusy}
                  onClick={() => setBulkDecision('REJECTED')}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Reject selected ({reviewableSelectedLines.length})
                </Button>
              </>
            ) : null}
            {canMutate ? (
              <>
                <Button
                  variant="outline"
                  disabled={!canPrepareReclaim || actionBusy}
                  onClick={() => setConfirmMode('prepare_reclaim')}
                  title={
                    canPrepareReclaim
                      ? undefined
                      : 'Select only Paid lines to prepare a reclaim'
                  }
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Prepare SONARWA reclaim
                </Button>
                <Button
                  disabled={!canMarkReimbursed || actionBusy}
                  onClick={() => setConfirmMode('mark_reimbursed')}
                  title={
                    canMarkReimbursed
                      ? undefined
                      : 'Select only Awaiting SONARWA reimbursement lines'
                  }
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark reimbursed by SONARWA
                </Button>
              </>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {selectedLineIds.size > 0
            ? `Export will start from ${selectedSummary.lineCount} selected line${selectedSummary.lineCount === 1 ? '' : 's'}; you can still filter by approved / rejected / pending.`
            : 'Choose which line statuses to include before exporting Excel or PDF. Tick vet groups or rows to narrow the set first.'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading commission lines…
        </div>
      ) : !groups.length ? (
        <div className="rounded-lg border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500">
          No commission lines for this filter. Try Ready to pay, Initiated, or
          Paid, or widen the date range.
        </div>
      ) : (
        <div className="space-y-3">
          {pagedGroups.map((group) => {
            const groupIds = group.lines.map((l) => l.id);
            const groupTri = selectionTriState(groupIds, selectedLineIds);
            const collapsed = collapsedVets.has(group.externalVetId);

            return (
              <div
                key={group.externalVetId}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={groupTri === 'all'}
                      ref={(el) => {
                        if (el) el.indeterminate = groupTri === 'some';
                      }}
                      onChange={() =>
                        setGroupSelection(group, groupTri !== 'all')
                      }
                      aria-label={`Select all lines for ${group.payeeName}`}
                    />
                    <button
                      type="button"
                      className="mt-0.5 rounded p-0.5 text-slate-500 hover:bg-slate-200/60"
                      onClick={() => toggleCollapse(group.externalVetId)}
                      aria-expanded={!collapsed}
                      aria-label={
                        collapsed ? 'Expand vet group' : 'Collapse vet group'
                      }
                    >
                      {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {group.payeeName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {[group.phoneNumber, group.bankName, group.bankAccountNumber]
                          .filter(Boolean)
                          .join(' · ') || 'No payout details'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 sm:justify-end">
                    <span>
                      {group.lines.length} line
                      {group.lines.length === 1 ? '' : 's'}
                    </span>
                    <span>
                      {group.batchCount} batch
                      {group.batchCount === 1 ? '' : 'es'}
                    </span>
                    <span className="font-medium text-slate-800">
                      Vet {formatRwf(group.totalVetCommission)}
                    </span>
                    <span className="font-medium text-slate-800">
                      Co. {formatRwf(group.totalCompanyCommission)}
                    </span>
                  </div>
                </div>

                {!collapsed ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-white text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="w-10 px-3 py-2" />
                          <th className="px-3 py-2 font-medium">Client ID</th>
                          <th className="px-3 py-2 font-medium">Client name</th>
                          <th className="px-3 py-2 font-medium">District</th>
                          <th className="px-3 py-2 font-medium">Contract</th>
                          <th className="px-3 py-2 font-medium">Branch</th>
                          <th className="px-3 py-2 font-medium">ProdDate</th>
                          <th className="px-3 py-2 font-medium">Net premium</th>
                          <th className="px-3 py-2 font-medium">
                            Vet commission
                          </th>
                          <th className="px-3 py-2 font-medium">Line</th>
                          <th className="px-3 py-2 font-medium">Batch</th>
                          <th className="px-3 py-2 font-medium">Txn ID</th>
                          <th className="px-3 py-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.lines.map((line) => (
                          <tr
                            key={line.id}
                            className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50/80 ${
                              line.lineStatus === 'REJECTED'
                                ? 'bg-rose-50/40'
                                : line.lineStatus === 'APPROVED'
                                  ? 'bg-emerald-50/20'
                                  : ''
                            }`}
                            onDoubleClick={() => setDetailLine(line)}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedLineIds.has(line.id)}
                                onChange={() => toggleLine(line.id)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Select line ${line.contract || line.sn}`}
                              />
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-900">
                              {line.clientId || '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-800">
                              {line.clientName || '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {line.clientDistrict || '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {line.contract || '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {line.branch || '—'}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {line.prodDate || '—'}
                            </td>
                            <td
                              className={`px-3 py-2 font-medium ${
                                line.lineStatus === 'REJECTED'
                                  ? 'text-slate-500 line-through decoration-rose-300'
                                  : ''
                              }`}
                            >
                              {formatRwf(line.netPremium)}
                            </td>
                            <td
                              className={`px-3 py-2 font-medium ${
                                line.lineStatus === 'REJECTED'
                                  ? 'text-slate-500 line-through decoration-rose-300'
                                  : ''
                              }`}
                            >
                              {formatRwf(line.vetCommission)}
                            </td>
                            <td className="px-3 py-2">
                              <LineStatusBadge status={line.lineStatus} />
                            </td>
                            <td className="px-3 py-2">
                              <ExternalVetStatusBadge
                                status={
                                  line.batchStatus as ExternalVetCommissionStatus
                                }
                              />
                            </td>
                            <td className="max-w-[9rem] px-3 py-2">
                              {line.batchStatus === 'REIMBURSED_BY_SONARWA' ||
                              line.reimbursementReference ? (
                                <span
                                  className="block truncate font-mono text-[11px] text-teal-900"
                                  title={
                                    line.reimbursementReference?.trim() ||
                                    undefined
                                  }
                                >
                                  {line.reimbursementReference?.trim() || '—'}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                            <td
                              className="px-3 py-2"
                              onClick={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDetailLine(line)}
                                >
                                  <Eye className="mr-1 h-3.5 w-3.5" />
                                  View
                                </Button>
                                {canMutate &&
                                canFinanceRejectBatchStatus(line.batchStatus) &&
                                firstLineIdByBatch.get(line.batchId) ===
                                  line.id ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-rose-200 text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
                                    disabled={actionBusy}
                                    onClick={() => openRejectForLine(line)}
                                    title={`Reject batch ${line.batchNumber}`}
                                  >
                                    <Ban className="mr-1 h-3.5 w-3.5" />
                                    Reject
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing vets {(safePage - 1) * GROUPS_PER_PAGE + 1}–
              {Math.min(safePage * GROUPS_PER_PAGE, groups.length)} of{' '}
              {groups.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="min-w-[5rem] text-center text-xs font-medium text-slate-700">
                Page {safePage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {detailLine ? (
        <LineDetailModal
          line={detailLine}
          onClose={() => setDetailLine(null)}
          review={
            canReviewLines &&
            reviewStage &&
            canReviewLinesAtBatchStatus(reviewStage, detailLine.batchStatus)
              ? {
                  stage: reviewStage,
                  busy: actionBusy,
                  onReview: async (payload) => {
                    await applyLineReviews(
                      [detailLine],
                      payload.decision,
                      payload.reason,
                    );
                    setDetailLine(null);
                  },
                }
              : null
          }
        />
      ) : null}

      <ExportIncludeDialog
        open={exportOpen}
        lines={exportRows}
        onClose={() => setExportOpen(false)}
        onExportExcel={(rows, include) =>
          runLinesExport('excel', rows, include)
        }
        onExportPdf={(rows, include) => runLinesExport('pdf', rows, include)}
      />

      {reviewStage ? (
        <LineReviewDialog
          open={bulkDecision != null}
          decision={bulkDecision}
          stage={reviewStage}
          lineCount={reviewableSelectedLines.length}
          lineLabel={`${reviewableSelectedLines.length} selected line${reviewableSelectedLines.length === 1 ? '' : 's'}`}
          busy={actionBusy}
          onClose={() => setBulkDecision(null)}
          onConfirm={async (payload) => {
            await applyLineReviews(
              reviewableSelectedLines,
              payload.decision,
              payload.reason,
            );
          }}
        />
      ) : null}

      {canMutate ? (
        <>
          <ReimbursementConfirmDialog
            open={confirmMode != null}
            mode={confirmMode ?? 'prepare_reclaim'}
            lineCount={selectedSummary.lineCount}
            batchCount={selectedSummary.batchCount}
            vetCount={selectedSummary.vetCount}
            totalVetCommission={selectedSummary.totalVetCommission}
            totalCompanyCommission={selectedSummary.totalCompanyCommission}
            exportReference={exportReference}
            onExportReferenceChange={setExportReference}
            reimbursedAt={reimbursedAt}
            onReimbursedAtChange={setReimbursedAt}
            reimbursementReference={reimbursementReference}
            onReimbursementReferenceChange={setReimbursementReference}
            busy={actionBusy}
            onCancel={() => {
              if (!actionBusy) setConfirmMode(null);
            }}
            onConfirm={() => {
              if (confirmMode === 'prepare_reclaim') {
                void confirmPrepareReclaim();
              } else {
                void confirmMarkReimbursed();
              }
            }}
          />
          <FinanceRejectDialog
            open={rejectTarget != null}
            target={rejectTarget}
            busy={actionBusy}
            onCancel={() => {
              if (!actionBusy) setRejectTarget(null);
            }}
            onConfirm={(reason) => {
              void confirmFinanceReject(reason);
            }}
          />
        </>
      ) : null}
    </div>
  );
}
