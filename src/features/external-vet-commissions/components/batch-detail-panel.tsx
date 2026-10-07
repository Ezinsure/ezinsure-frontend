'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Receipt,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useApiClient } from '@/utils/apiClient';
import {
  COMMISSION_LINE_COLUMN_LABELS,
  canViewCompanyCommission,
  commissionLineColumnsForAudience,
  formatCommissionLineCell,
  formatRwf,
  type ExportLineIncludeFilter,
  type ExternalVetCommissionBatch,
  type ExternalVetCommissionLine,
  type ExternalVetCommissionLineListItem,
  type ExternalVetReviewStage,
  type ExternalVetsViewRole,
} from '../domain';
import {
  downloadBatchSourceDocument,
  resolveDownloadFileName,
} from '../download-source-document';
import {
  exportExternalVetBatchDetailToExcel,
  exportExternalVetBatchDetailToPdf,
} from '../export/batch-detail-export';
import {
  canActorReviewLine,
  filterAndSortLinesForStageReview,
  getLineStageReviewState,
  summarizePayableLines,
  summarizeStageReview,
  type BulkReviewLinesInput,
  type ReviewLineInput,
  type StageReviewFilter,
} from '../line-review';
import { linesFromBatch } from '../mappers';
import { ExportIncludeDialog } from './export-include-dialog';
import {
  LineDetailModal,
  type LineDetailReviewConfig,
} from './line-detail-modal';
import {
  LineReviewDialog,
  type LineReviewDecision,
} from './line-review-dialog';
import { LineReviewSummaryBar } from './line-review-summary-bar';
import { StageReviewBadge } from './stage-review-badge';
import { ExternalVetStatusBadge } from './status-badge';
import { LineStatusBadge } from './line-status-badge';
import { useWindowedList, WindowedListFooter } from './windowed-rows';

type Props = {
  batch: ExternalVetCommissionBatch | null;
  isLoading?: boolean;
  onClose: () => void;
  footer?: React.ReactNode;
  reviewStage?: ExternalVetReviewStage | null;
  reviewBusy?: boolean;
  onReviewLine?: (
    input: Omit<ReviewLineInput, 'batchId' | 'stage'> & { lineId: string },
  ) => Promise<void>;
  /** Bulk approve/reject selected lines in this batch (admin / finance / sonarwa). */
  onBulkReviewLines?: (
    input: Omit<BulkReviewLinesInput, 'batchId' | 'stage'> & {
      lineIds: string[];
    },
  ) => Promise<void>;
  /** Portal audience — controls company-commission visibility. */
  viewRole?: ExternalVetsViewRole;
};

function selectionTriState(
  ids: string[],
  selected: Set<string>,
): 'none' | 'some' | 'all' {
  if (!ids.length) return 'none';
  let hit = 0;
  for (const id of ids) {
    if (selected.has(id)) hit += 1;
  }
  if (hit === 0) return 'none';
  if (hit === ids.length) return 'all';
  return 'some';
}

type DetailTab = 'overview' | 'lines';

function formatDisplayDate(value?: string): string {
  if (!value?.trim()) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDisplayDateTime(value?: string): string {
  if (!value?.trim()) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BatchDetailPanel({
  batch,
  isLoading = false,
  onClose,
  footer,
  reviewStage = null,
  reviewBusy = false,
  onReviewLine,
  onBulkReviewLines,
  viewRole = 'admin',
}: Props) {
  const { showToast, ToastContainer } = useToast();
  const { apiFetch } = useApiClient();
  const [exportOpen, setExportOpen] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [detailLine, setDetailLine] =
    useState<ExternalVetCommissionLineListItem | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('lines');
  const [stageReviewFilter, setStageReviewFilter] =
    useState<StageReviewFilter>('needs_my_review');
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [bulkDecision, setBulkDecision] = useState<LineReviewDecision | null>(
    null,
  );

  const showCompanyCommission = canViewCompanyCommission(viewRole);
  const lineColumns = commissionLineColumnsForAudience(viewRole);

  const documentUrl = batch?.sourceDocumentUrl?.trim() || '';
  const documentName =
    batch?.sourceDocumentName || batch?.sourceFileName || 'Request form';
  const downloadFileName = resolveDownloadFileName(
    documentName,
    batch?.sourceFileName,
  );
  const canDownload = Boolean(batch?.id && (documentUrl || batch?.sourceFileName));

  useEffect(() => {
    // Prefer the lines workspace whenever a batch opens — that is the work surface.
    setActiveTab('lines');
    setSelectedLineIds(new Set());
    setBulkDecision(null);
  }, [batch?.id]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (bulkDecision) {
          setBulkDecision(null);
          return;
        }
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bulkDecision, onClose]);

  const payable = useMemo(
    () => (batch ? summarizePayableLines(batch.lines) : null),
    [batch],
  );

  const canReviewLines =
    Boolean(batch && reviewStage && (onReviewLine || onBulkReviewLines)) &&
    canActorReviewLine({
      stage: reviewStage as ExternalVetReviewStage,
      batchStatus: batch!.status,
      allowed: true,
    });

  const canBulkReview = canReviewLines && Boolean(onBulkReviewLines);

  useEffect(() => {
    // Admin/finance open to work remaining; Sonarwa same pattern when reviewing.
    setStageReviewFilter(canReviewLines ? 'needs_my_review' : 'all');
    setSelectedLineIds(new Set());
  }, [batch?.id, canReviewLines]);

  const stageSummary = useMemo(() => {
    if (!batch || !reviewStage || !canReviewLines) return null;
    return summarizeStageReview(batch.lines, reviewStage, batch.status);
  }, [batch, canReviewLines, reviewStage]);

  const displayLines = useMemo(() => {
    if (!batch) return [];
    if (!reviewStage || !canReviewLines) return batch.lines;
    return filterAndSortLinesForStageReview(
      batch.lines,
      reviewStage,
      batch.status,
      stageReviewFilter,
    );
  }, [batch, canReviewLines, reviewStage, stageReviewFilter]);

  useEffect(() => {
    // Drop selections that are no longer in the filtered view.
    setSelectedLineIds((prev) => {
      if (!prev.size) return prev;
      const visible = new Set(displayLines.map((l) => l.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (visible.has(id)) next.add(id);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [displayLines]);

  // Batch detail lines tab has room for a tall table — only window very large
  // sheets so a typical 50–100 line request is fully visible without clicking.
  const lineWindow = useWindowedList(displayLines, {
    chunkSize: 80,
    threshold: 120,
  });

  const displayLineIds = useMemo(
    () => displayLines.map((line) => line.id),
    [displayLines],
  );

  const selectAllTri = selectionTriState(displayLineIds, selectedLineIds);

  const selectedLines = useMemo(
    () => displayLines.filter((line) => selectedLineIds.has(line.id)),
    [displayLines, selectedLineIds],
  );

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedLineIds((prev) => {
      if (selectAllTri === 'all') return new Set();
      return new Set(displayLineIds);
    });
  }, [displayLineIds, selectAllTri]);

  const toggleLineSelected = useCallback((lineId: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }, []);

  const confirmBulkReview = useCallback(
    async (payload: { decision: LineReviewDecision; reason?: string }) => {
      if (!onBulkReviewLines || !selectedLines.length) return;
      if (payload.decision === 'REJECTED' && !payload.reason?.trim()) {
        showToast('A rejection reason is required', 'error');
        return;
      }
      try {
        await onBulkReviewLines({
          lineIds: selectedLines.map((line) => line.id),
          decision: payload.decision,
          reason: payload.reason,
        });
        setBulkDecision(null);
        setSelectedLineIds(new Set());
      } catch {
        // Hub already toasted; keep dialog open so the user can retry.
      }
    },
    [onBulkReviewLines, selectedLines, showToast],
  );

  const handleDownloadOriginal = useCallback(async () => {
    if (!batch?.id) return;
    setDownloadBusy(true);
    try {
      await downloadBatchSourceDocument({
        batchId: batch.id,
        fileName: downloadFileName,
        fallbackUrl: documentUrl || undefined,
        apiFetch,
      });
      showToast('Request form downloaded', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to download request form',
        'error',
      );
    } finally {
      setDownloadBusy(false);
    }
  }, [apiFetch, batch?.id, documentUrl, downloadFileName, showToast]);

  const runExport = useCallback(
    async (
      kind: 'excel' | 'pdf',
      lines: ExternalVetCommissionLine[],
      include: ExportLineIncludeFilter,
    ) => {
      if (!batch) return;
      const payload: ExternalVetCommissionBatch = {
        ...batch,
        lines,
        lineCount: lines.length,
      };
      if (kind === 'excel') {
        await exportExternalVetBatchDetailToExcel(payload);
        showToast(
          `Exported ${lines.length} ${include === 'ALL' ? '' : `${include.toLowerCase().replace('_', ' ')} `}line${lines.length === 1 ? '' : 's'} to Excel`,
          'success',
        );
      } else {
        await exportExternalVetBatchDetailToPdf(payload);
        showToast(
          `Exported ${lines.length} line${lines.length === 1 ? '' : 's'} to PDF`,
          'success',
        );
      }
    },
    [batch, showToast],
  );

  const openLine = useCallback(
    (line: ExternalVetCommissionLine) => {
      if (!batch) return;
      setDetailLine(
        linesFromBatch({
          ...batch,
          lines: [line],
        })[0],
      );
    },
    [batch],
  );

  const lineReviewConfig: LineDetailReviewConfig | null =
    canReviewLines && detailLine && reviewStage && onReviewLine
      ? {
          stage: reviewStage,
          busy: reviewBusy,
          onReview: async (payload) => {
            await onReviewLine({
              lineId: detailLine.id,
              decision: payload.decision,
              reason: payload.reason,
            });
            setDetailLine(null);
          },
        }
      : null;

  const isRejected = batch?.status === 'REJECTED';
  const isReimbursed = batch?.status === 'REIMBURSED_BY_SONARWA';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <ToastContainer />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-detail-title"
        className="flex h-full w-full max-w-full flex-col bg-white shadow-xl sm:max-w-[min(96rem,96vw)]"
      >
        <div className="shrink-0 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Commission batch
              </p>
              <h2
                id="batch-detail-title"
                className="mt-0.5 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg"
                title={
                  isLoading && !batch
                    ? 'Loading…'
                    : batch?.batchNumber || undefined
                }
              >
                {isLoading && !batch ? 'Loading…' : batch?.batchNumber || '—'}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {batch ? <ExternalVetStatusBadge status={batch.status} /> : null}
                {batch?.periodLabel ? (
                  <span className="text-xs text-slate-600 sm:text-sm">
                    {batch.periodLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <Button
              variant="text"
              size="sm"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 sm:border-0 sm:pt-0">
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || !batch?.lines?.length}
              onClick={() => setExportOpen(true)}
              className="w-full sm:w-auto"
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export lines
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {batch ? (
            <div
              role="tablist"
              aria-label="Batch detail sections"
              className="flex shrink-0 gap-1 border-b border-slate-200 px-4 sm:px-5"
            >
              {(
                [
                  { id: 'overview' as const, label: 'Overview' },
                  {
                    id: 'lines' as const,
                    label: `Lines (${batch.lineCount})`,
                  },
                ] as const
              ).map((tab) => {
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    id={`batch-tab-${tab.id}`}
                    aria-controls={`batch-panel-${tab.id}`}
                    className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 ${
                      selected
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-hidden">
            {isLoading && !batch ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <p className="text-sm font-medium">Loading batch details…</p>
              </div>
            ) : null}

            {batch && activeTab === 'overview' ? (
              <div
                id="batch-panel-overview"
                role="tabpanel"
                aria-labelledby="batch-tab-overview"
                className="h-full space-y-4 overflow-y-auto overscroll-contain px-4 py-3 sm:space-y-5 sm:px-5 sm:py-4"
              >
                {isRejected ? (
                  <section className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-3.5 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-rose-950">
                          Application rejected
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-rose-900/90">
                          {batch.reviewNote?.trim() ||
                            'No rejection note was recorded for this batch.'}
                        </p>
                        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div>
                            <dt className="text-[11px] uppercase tracking-wide text-rose-700/80">
                              Rejected by
                            </dt>
                            <dd className="text-sm font-medium text-rose-950">
                              {batch.reviewedByName || '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-wide text-rose-700/80">
                              Rejected at
                            </dt>
                            <dd className="text-sm font-medium text-rose-950">
                              {formatDisplayDateTime(batch.reviewedAt)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                  </section>
                ) : null}

                {isReimbursed ? (
                  <section className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-3.5 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
                        <Receipt className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-teal-950">
                          SONARWA reimbursement
                        </h3>
                        <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <dt className="text-[11px] uppercase tracking-wide text-teal-700/80">
                              Transaction ID
                            </dt>
                            <dd className="mt-0.5 break-all font-mono text-sm font-semibold text-teal-950">
                              {batch.reimbursementReference?.trim() ||
                                'Not recorded'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-wide text-teal-700/80">
                              Reimbursed at
                            </dt>
                            <dd className="text-sm font-medium text-teal-950">
                              {formatDisplayDateTime(batch.reimbursedBySonarwaAt)}
                            </dd>
                          </div>
                          {batch.exportReference ? (
                            <div>
                              <dt className="text-[11px] uppercase tracking-wide text-teal-700/80">
                                Export reference
                              </dt>
                              <dd className="text-sm font-medium text-teal-950">
                                {batch.exportReference}
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                      </div>
                    </div>
                  </section>
                ) : null}

                {payable ? (
                  <LineReviewSummaryBar
                    summary={payable}
                    showCompanyCommission={showCompanyCommission}
                    stageSummary={stageSummary}
                  />
                ) : null}

                <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-800">
                    Veterinary agent
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    <Info label="Name" value={batch.payee?.name ?? '—'} />
                    <Info
                      label="Phone / MoMo"
                      value={batch.payee?.phoneNumber ?? '—'}
                    />
                    <Info
                      label="District"
                      value={batch.payee?.district || '—'}
                    />
                    <Info label="Sector" value={batch.payee?.sector || '—'} />
                    <Info
                      label="Request date"
                      value={formatDisplayDate(
                        batch.payee?.commissionRequestDate,
                      )}
                    />
                    <Info
                      label="Bank"
                      value={batch.payee?.bankName?.trim() || '—'}
                    />
                    <Info
                      label="Account"
                      value={batch.payee?.bankAccountNumber?.trim() || '—'}
                    />
                    <Info label="Period" value={batch.periodLabel || '—'} />
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800">
                        Original request form
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Downloaded securely via the API. Use this file to verify
                        lines against the source document.
                      </p>
                    </div>
                    {canDownload ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full shrink-0 sm:w-auto"
                        disabled={downloadBusy}
                        onClick={() => void handleDownloadOriginal()}
                      >
                        {downloadBusy ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Download
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-start gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
                    <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-medium text-slate-900"
                        title={documentName}
                      >
                        {documentName}
                      </p>
                      {canDownload ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Saves as{' '}
                          <span className="font-medium text-slate-700">
                            {downloadFileName}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-amber-700">
                          Original document is not available on this batch yet.
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 sm:p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-800">
                    Financial summary
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    <Info label="Created by" value={batch.createdByName} />
                    <Info
                      label="Created at"
                      value={new Date(batch.createdAt).toLocaleString()}
                    />
                    {showCompanyCommission ? (
                      <Info
                        label="Company commission %"
                        value={`${batch.companyCommissionPercent}%`}
                      />
                    ) : null}
                    <Info label="Lines" value={String(batch.lineCount)} />
                    <Info
                      label="Payable vet commission"
                      value={formatRwf(payable?.totalVetCommission ?? 0)}
                    />
                    {showCompanyCommission ? (
                      <Info
                        label="Payable company commission"
                        value={formatRwf(payable?.totalCompanyCommission ?? 0)}
                      />
                    ) : null}
                    {showCompanyCommission ? (
                      <Info
                        label="Payable total"
                        value={formatRwf(payable?.totalCommission ?? 0)}
                      />
                    ) : null}
                    {showCompanyCommission ? (
                      <Info
                        label="Billable to SONARWA"
                        value={formatRwf(payable?.billableToSonarwa ?? 0)}
                      />
                    ) : null}
                    <Info
                      label={
                        showCompanyCommission
                          ? 'Gross (all lines)'
                          : 'Gross vet commission (all lines)'
                      }
                      value={formatRwf(
                        showCompanyCommission
                          ? (payable?.gross.totalCommission ?? 0)
                          : (payable?.gross.totalVetCommission ?? 0),
                      )}
                    />
                    {batch.reviewedByName && !isRejected ? (
                      <Info label="Reviewed by" value={batch.reviewedByName} />
                    ) : null}
                    {batch.reviewNote && !isRejected ? (
                      <Info label="Review note" value={batch.reviewNote} />
                    ) : null}
                    {batch.paidByName ? (
                      <Info label="Paid by" value={batch.paidByName} />
                    ) : null}
                    {batch.reimbursementReference && !isReimbursed ? (
                      <Info
                        label="SONARWA transaction ID"
                        value={batch.reimbursementReference}
                      />
                    ) : null}
                  </div>
                </section>
              </div>
            ) : null}

            {batch && activeTab === 'lines' ? (
              <div
                id="batch-panel-lines"
                role="tabpanel"
                aria-labelledby="batch-tab-lines"
                className="flex h-full min-h-0 flex-col px-4 py-3 sm:px-5 sm:py-4"
              >
                <div className="mb-2 flex shrink-0 flex-col gap-2">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        Commission lines
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {batch.lineCount} line
                        {batch.lineCount === 1 ? '' : 's'} in this request
                        {stageSummary ? (
                          <>
                            {' '}
                            · {stageSummary.needsMyReview} need your review ·{' '}
                            {stageSummary.confirmedByMe} you approved ·{' '}
                            {stageSummary.rejectedByMe} you rejected
                          </>
                        ) : payable ? (
                          <>
                            {' '}
                            · {payable.counts.pending} pending ·{' '}
                            {payable.counts.approved} approved ·{' '}
                            {payable.counts.rejected} rejected
                          </>
                        ) : null}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {canReviewLines
                        ? 'Click a row to review that line'
                        : 'Click a row for full details'}
                      <span className="sm:hidden"> · swipe for columns</span>
                    </p>
                  </div>

                  {canReviewLines && stageSummary ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          {
                            id: 'needs_my_review' as const,
                            label: 'Needs my review',
                            count: stageSummary.needsMyReview,
                          },
                          {
                            id: 'reviewed_by_me' as const,
                            label: 'Reviewed by me',
                            count:
                              stageSummary.confirmedByMe +
                              stageSummary.rejectedByMe,
                          },
                          {
                            id: 'all' as const,
                            label: 'All',
                            count: stageSummary.total,
                          },
                        ] as const
                      ).map((chip) => {
                        const active = stageReviewFilter === chip.id;
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => setStageReviewFilter(chip.id)}
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition-colors ${
                              active
                                ? 'bg-slate-900 text-white ring-slate-900'
                                : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {chip.label}
                            <span
                              className={
                                active ? 'text-slate-300' : 'text-slate-400'
                              }
                            >
                              {chip.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {canBulkReview ? (
                    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={selectAllTri === 'all'}
                          ref={(el) => {
                            if (el) el.indeterminate = selectAllTri === 'some';
                          }}
                          onChange={toggleSelectAllVisible}
                          disabled={!displayLines.length || reviewBusy}
                          aria-label="Select all visible lines"
                        />
                        <span>
                          {selectedLineIds.size > 0
                            ? `${selectedLineIds.size} selected`
                            : `Select lines (${displayLines.length} visible)`}
                        </span>
                        {selectedLineIds.size > 0 ? (
                          <button
                            type="button"
                            className="font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
                            onClick={() => setSelectedLineIds(new Set())}
                          >
                            Clear
                          </button>
                        ) : null}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            reviewBusy || selectedLineIds.size === 0
                          }
                          onClick={() => setBulkDecision('APPROVED')}
                          className="border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Approve selected ({selectedLineIds.size})
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            reviewBusy || selectedLineIds.size === 0
                          }
                          onClick={() => setBulkDecision('REJECTED')}
                          className="border-rose-200 text-rose-700 hover:bg-rose-50"
                        >
                          <Ban className="mr-1.5 h-3.5 w-3.5" />
                          Reject selected ({selectedLineIds.size})
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-slate-200">
                  {isLoading ? (
                    <div className="flex items-center gap-2 px-4 py-8 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Refreshing lines…
                    </div>
                  ) : displayLines.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-slate-500">
                      {canReviewLines && stageReviewFilter === 'needs_my_review'
                        ? 'No lines left that need your review.'
                        : 'No lines match this filter.'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto overscroll-x-contain">
                      <table className="min-w-max w-full text-left text-xs">
                        <thead className="sticky top-0 z-[1] bg-slate-50 text-slate-600">
                          <tr>
                            {canBulkReview ? (
                              <th className="sticky left-0 z-[2] whitespace-nowrap bg-slate-50 px-3 py-2.5 font-medium">
                                <span className="sr-only">Select</span>
                              </th>
                            ) : null}
                            {canReviewLines ? (
                              <th
                                className={`whitespace-nowrap bg-slate-50 px-3 py-2.5 font-medium ${
                                  canBulkReview ? '' : 'sticky left-0 z-[2]'
                                }`}
                              >
                                Your review
                              </th>
                            ) : null}
                            <th
                              className={`whitespace-nowrap bg-slate-50 px-3 py-2.5 font-medium ${
                                canReviewLines || canBulkReview
                                  ? ''
                                  : 'sticky left-0 z-[2]'
                              }`}
                            >
                              Line status
                            </th>
                            {lineColumns.map((key) => (
                              <th
                                key={key}
                                className="whitespace-nowrap px-3 py-2.5 font-medium"
                              >
                                {COMMISSION_LINE_COLUMN_LABELS[key]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {lineWindow.slice.map((line) => {
                            const stageState =
                              canReviewLines && reviewStage
                                ? getLineStageReviewState(
                                    line,
                                    reviewStage,
                                    batch.status,
                                  )
                                : 'not_in_my_queue';
                            const needsMyReview =
                              stageState === 'needs_my_review';
                            const isSelected = selectedLineIds.has(line.id);

                            return (
                              <tr
                                key={line.id}
                                className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50/90 ${
                                  needsMyReview
                                    ? 'border-l-4 border-l-amber-400 bg-amber-50/50'
                                    : line.lineStatus === 'REJECTED'
                                      ? 'bg-rose-50/40'
                                      : line.lineStatus === 'APPROVED'
                                        ? 'bg-emerald-50/20'
                                        : ''
                                } ${isSelected ? 'bg-sky-50/70' : ''}`}
                                onClick={() => openLine(line)}
                              >
                                {canBulkReview ? (
                                  <td
                                    className="sticky left-0 z-[1] whitespace-nowrap bg-inherit px-3 py-2.5"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={reviewBusy}
                                      onChange={() =>
                                        toggleLineSelected(line.id)
                                      }
                                      aria-label={`Select line ${line.sn || line.contract || line.id}`}
                                    />
                                  </td>
                                ) : null}
                                {canReviewLines ? (
                                  <td
                                    className={`whitespace-nowrap bg-inherit px-3 py-2.5 ${
                                      canBulkReview ? '' : 'sticky left-0 z-[1]'
                                    }`}
                                  >
                                    <StageReviewBadge state={stageState} />
                                  </td>
                                ) : null}
                                <td
                                  className={`whitespace-nowrap bg-inherit px-3 py-2.5 ${
                                    canReviewLines || canBulkReview
                                      ? ''
                                      : 'sticky left-0 z-[1]'
                                  }`}
                                >
                                  <div className="flex flex-col gap-1">
                                    <LineStatusBadge status={line.lineStatus} />
                                    {canReviewLines &&
                                    stageState === 'needs_my_review' &&
                                    line.lineStatus !== 'PENDING_REVIEW' ? (
                                      <span className="text-[10px] font-medium text-slate-500">
                                        Prior stage outcome
                                      </span>
                                    ) : null}
                                  </div>
                                </td>
                                {lineColumns.map((key) => (
                                  <td
                                    key={key}
                                    className={`whitespace-nowrap px-3 py-2.5 ${
                                      key === 'contract'
                                        ? 'font-mono text-[11px]'
                                        : ''
                                    } ${
                                      key === 'vetCommission' ||
                                      key === 'companyCommission'
                                        ? 'font-medium'
                                        : ''
                                    } ${
                                      line.lineStatus === 'REJECTED'
                                        ? 'text-slate-500 line-through decoration-rose-300'
                                        : ''
                                    }`}
                                  >
                                    {formatCommissionLineCell(line, key)}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <WindowedListFooter
                        total={lineWindow.total}
                        visibleCount={lineWindow.visibleCount}
                        remaining={lineWindow.remaining}
                        needsWindow={lineWindow.needsWindow}
                        onShowMore={lineWindow.showMore}
                        onShowAll={lineWindow.showAll}
                        chunkHint={80}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {footer && batch ? (
          <div className="sticky bottom-0 z-10 shrink-0 border-t border-slate-200 bg-white/95 px-4 py-2 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>

      {batch ? (
        <ExportIncludeDialog
          open={exportOpen}
          lines={batch.lines}
          onClose={() => setExportOpen(false)}
          onExportExcel={(lines, include) => runExport('excel', lines, include)}
          onExportPdf={(lines, include) => runExport('pdf', lines, include)}
        />
      ) : null}

      {detailLine ? (
        <LineDetailModal
          line={detailLine}
          onClose={() => setDetailLine(null)}
          review={lineReviewConfig}
          viewRole={viewRole}
        />
      ) : null}

      {canBulkReview && reviewStage && bulkDecision ? (
        <LineReviewDialog
          open
          decision={bulkDecision}
          stage={reviewStage}
          lineCount={selectedLines.length}
          lineLabel={
            selectedLines.length === 1
              ? selectedLines[0]?.contract ||
                selectedLines[0]?.clientName ||
                `Line ${selectedLines[0]?.sn ?? ''}`
              : `${selectedLines.length} lines in ${batch?.batchNumber || 'this request'}`
          }
          busy={reviewBusy}
          onClose={() => setBulkDecision(null)}
          onConfirm={confirmBulkReview}
        />
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 break-words text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}
