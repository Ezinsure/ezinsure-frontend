'use client';

import { useCallback, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataExportActions } from '@/components/ui/data-export-actions';
import { useToast } from '@/components/ui/toast';
import {
  COMMISSION_LINE_COLUMN_KEYS,
  COMMISSION_LINE_COLUMN_LABELS,
  calcBillableToSonarwa,
  calcTotalCommission,
  calcVatOnTotalCommission,
  formatCommissionLineCell,
  formatRwf,
  type ExternalVetCommissionBatch,
} from '../domain';
import {
  exportExternalVetBatchDetailToExcel,
  exportExternalVetBatchDetailToPdf,
} from '../export/batch-detail-export';
import { ExternalVetStatusBadge } from './status-badge';

type Props = {
  batch: ExternalVetCommissionBatch | null;
  isLoading?: boolean;
  onClose: () => void;
  footer?: React.ReactNode;
};

/**
 * Cloudinary `raw` uploads often omit a file extension in the URL.
 * Always prefer the stored display name (…xlsx / …pdf) when saving locally.
 */
function resolveDownloadFileName(
  documentName: string,
  sourceFileName?: string,
): string {
  const named = (documentName || sourceFileName || 'claim-form').trim();
  if (/\.[a-z0-9]{2,5}$/i.test(named)) return named;
  const fromSource = (sourceFileName || '').trim();
  if (/\.[a-z0-9]{2,5}$/i.test(fromSource)) return fromSource;
  return `${named || 'claim-form'}.xlsx`;
}

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

export function BatchDetailPanel({
  batch,
  isLoading = false,
  onClose,
  footer,
}: Props) {
  const { showToast, ToastContainer } = useToast();
  const [exportBusy, setExportBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const handleExportExcel = useCallback(async () => {
    if (!batch?.lines?.length) {
      showToast('No commission lines to export', 'error');
      return;
    }
    setExportBusy(true);
    try {
      await exportExternalVetBatchDetailToExcel(batch);
      showToast('Batch exported to Excel', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Excel export failed', 'error');
    } finally {
      setExportBusy(false);
    }
  }, [batch, showToast]);

  const handleExportPdf = useCallback(async () => {
    if (!batch?.lines?.length) {
      showToast('No commission lines to export', 'error');
      return;
    }
    setExportBusy(true);
    try {
      await exportExternalVetBatchDetailToPdf(batch);
      showToast('Batch exported to PDF', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'PDF export failed', 'error');
    } finally {
      setExportBusy(false);
    }
  }, [batch, showToast]);

  const documentUrl = batch?.sourceDocumentUrl?.trim() || '';
  const documentName =
    batch?.sourceDocumentName || batch?.sourceFileName || 'Claim form';
  const downloadFileName = resolveDownloadFileName(
    documentName,
    batch?.sourceFileName,
  );

  const handleDownloadOriginal = useCallback(async () => {
    if (!documentUrl) return;
    setDownloadBusy(true);
    try {
      const response = await fetch(documentUrl);
      if (!response.ok) {
        throw new Error(`Download failed (${response.status})`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = downloadFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      showToast('Claim form downloaded', 'success');
    } catch {
      // Cross-origin / CORS: open in a new tab as last resort.
      window.open(documentUrl, '_blank', 'noopener,noreferrer');
      showToast(
        'Opened file in a new tab. If the name has no extension, rename it to .xlsx or .pdf after saving.',
        'error',
      );
    } finally {
      setDownloadBusy(false);
    }
  }, [documentUrl, downloadFileName, showToast]);

  const totalCommission = batch
    ? calcTotalCommission(batch.totalVetCommission, batch.totalCompanyCommission)
    : 0;
  const vat = calcVatOnTotalCommission(totalCommission);
  const billable = calcBillableToSonarwa(totalCommission);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <ToastContainer />
      <div className="flex h-full w-full max-w-full flex-col bg-white shadow-xl sm:max-w-[min(96rem,96vw)]">
        {/* Header — stacks cleanly on phones */}
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
            <DataExportActions
              disabled={exportBusy || isLoading || !batch?.lines?.length}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              excelLabel="Excel"
              pdfLabel="PDF"
              className="w-full sm:w-auto [&_button]:flex-1 sm:[&_button]:flex-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 space-y-4 sm:space-y-6">
          {isLoading && !batch ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <p className="text-sm font-medium">Loading batch details…</p>
            </div>
          ) : null}

          {batch ? (
            <>
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
                      Download the uploaded Excel/PDF to verify lines against
                      the source document. In-browser preview is not available
                      for these file types.
                    </p>
                  </div>
                  {documentUrl ? (
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
                    {documentUrl ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Saves as{' '}
                        <span className="font-medium text-slate-700">
                          {downloadFileName}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-amber-700">
                        File name only is stored on this batch. Backend must
                        return `sourceDocumentUrl` for download.
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
                  {batch.reviewedByName ? (
                    <Info label="Reviewed by" value={batch.reviewedByName} />
                  ) : null}
                  {batch.reviewNote ? (
                    <Info label="Review note" value={batch.reviewNote} />
                  ) : null}
                  {batch.paidByName ? (
                    <Info label="Paid by" value={batch.paidByName} />
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
                            className="border-t border-slate-100"
                          >
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
