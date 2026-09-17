'use client';

import { useCallback, useState } from 'react';
import {
  AlertTriangle,
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
  COMMISSION_LINE_COLUMN_KEYS,
  COMMISSION_LINE_COLUMN_LABELS,
  calcBillableToSonarwa,
  calcTotalCommission,
  calcVatOnTotalCommission,
  formatCommissionLineCell,
  formatRwf,
  type ExportLineIncludeFilter,
  type ExternalVetCommissionBatch,
  type ExternalVetCommissionLine,
} from '../domain';
import {
  downloadBatchSourceDocument,
  resolveDownloadFileName,
} from '../download-source-document';
import {
  exportExternalVetBatchDetailToExcel,
  exportExternalVetBatchDetailToPdf,
} from '../export/batch-detail-export';
import { ExportIncludeDialog } from './export-include-dialog';
import { ExternalVetStatusBadge } from './status-badge';
import { LineStatusBadge } from './line-status-badge';

type Props = {
  batch: ExternalVetCommissionBatch | null;
  isLoading?: boolean;
  onClose: () => void;
  footer?: React.ReactNode;
};

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
}: Props) {
  const { showToast, ToastContainer } = useToast();
  const { apiFetch } = useApiClient();
  const [exportOpen, setExportOpen] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const documentUrl = batch?.sourceDocumentUrl?.trim() || '';
  const documentName =
    batch?.sourceDocumentName || batch?.sourceFileName || 'Claim form';
  const downloadFileName = resolveDownloadFileName(
    documentName,
    batch?.sourceFileName,
  );
  const canDownload = Boolean(batch?.id && (documentUrl || batch?.sourceFileName));

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
      showToast('Claim form downloaded', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to download claim form',
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

  const totalCommission = batch
    ? calcTotalCommission(batch.totalVetCommission, batch.totalCompanyCommission)
    : 0;
  const vat = calcVatOnTotalCommission(totalCommission);
  const billable = calcBillableToSonarwa(totalCommission);
  const isRejected = batch?.status === 'REJECTED';
  const isReimbursed = batch?.status === 'REIMBURSED_BY_SONARWA';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <ToastContainer />
      <div className="flex h-full w-full max-w-full flex-col bg-white shadow-xl sm:max-w-[min(96rem,96vw)]">
        <div className="shrink-0 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Commission batch
              </p>
              <h2
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:space-y-6 sm:px-5">
          {isLoading && !batch ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <p className="text-sm font-medium">Loading batch details…</p>
            </div>
          ) : null}

          {batch ? (
            <>
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
                  <Info label="District" value={batch.payee?.district || '—'} />
                  <Info label="Sector" value={batch.payee?.sector || '—'} />
                  <Info
                    label="Request date"
                    value={formatDisplayDate(batch.payee?.commissionRequestDate)}
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
                      Original claim form
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
                  <Info
                    label="Company commission %"
                    value={`${batch.companyCommissionPercent}%`}
                  />
                  <Info label="Lines" value={String(batch.lineCount)} />
                  <Info
                    label="Vet commission"
                    value={formatRwf(batch.totalVetCommission)}
                  />
                  <Info
                    label="Company commission"
                    value={formatRwf(batch.totalCompanyCommission)}
                  />
                  <Info
                    label="Total commission"
                    value={formatRwf(totalCommission)}
                  />
                  <Info label="VAT (18%)" value={formatRwf(vat)} />
                  <Info
                    label="Billable to SONARWA"
                    value={formatRwf(billable)}
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

              <section>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Lines ({batch.lineCount})
                  </h3>
                  <p className="text-[11px] text-slate-500 sm:hidden">
                    Swipe sideways to see all columns
                  </p>
                </div>
                {isLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-8 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refreshing lines…
                  </div>
                ) : (
                  <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 sm:mx-0 sm:rounded-lg sm:border sm:border-slate-200 sm:px-0">
                    <table className="min-w-max w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="sticky left-0 z-[1] whitespace-nowrap bg-slate-50 px-3 py-2.5 font-medium">
                            Line status
                          </th>
                          {COMMISSION_LINE_COLUMN_KEYS.map((key) => (
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
                        {batch.lines.map((line) => (
                          <tr
                            key={line.id}
                            className={`border-t border-slate-100 ${
                              line.lineStatus === 'REJECTED'
                                ? 'bg-rose-50/40'
                                : line.lineStatus === 'APPROVED'
                                  ? 'bg-emerald-50/20'
                                  : ''
                            }`}
                          >
                            <td className="sticky left-0 z-[1] whitespace-nowrap bg-inherit px-3 py-2.5">
                              <LineStatusBadge status={line.lineStatus} />
                            </td>
                            {COMMISSION_LINE_COLUMN_KEYS.map((key) => (
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>

        {footer && batch ? (
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
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
