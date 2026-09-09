'use client';

import { useCallback, useState } from 'react';
import { Download, Eye, FileSpreadsheet, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataExportActions } from '@/components/ui/data-export-actions';
import { DocumentViewer } from '@/components/ui/document-viewer';
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

export function BatchDetailPanel({
  batch,
  isLoading = false,
  onClose,
  footer,
}: Props) {
  const { showToast, ToastContainer } = useToast();
  const [exportBusy, setExportBusy] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

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

  const totalCommission = batch
    ? calcTotalCommission(batch.totalVetCommission, batch.totalCompanyCommission)
    : 0;
  const vat = calcVatOnTotalCommission(totalCommission);
  const billable = calcBillableToSonarwa(totalCommission);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <ToastContainer />
      <div className="flex h-full w-full max-w-[min(96rem,96vw)] flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Commission batch
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              {isLoading && !batch ? 'Loading…' : batch?.batchNumber || '—'}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {batch ? <ExternalVetStatusBadge status={batch.status} /> : null}
              {batch?.periodLabel ? (
                <span className="text-sm text-slate-600">{batch.periodLabel}</span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <DataExportActions
              disabled={exportBusy || isLoading || !batch?.lines?.length}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              excelLabel="Download Excel"
              pdfLabel="Download PDF"
            />
            <Button variant="text" size="sm" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {isLoading && !batch ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <p className="text-sm font-medium">Loading batch details…</p>
            </div>
          ) : null}

          {batch ? (
            <>
              <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  Veterinary agent
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Info label="Name" value={batch.payee?.name ?? '—'} />
                  <Info label="Phone / MoMo" value={batch.payee?.phoneNumber ?? '—'} />
                  <Info label="District" value={batch.payee?.district || '—'} />
                  <Info label="Sector" value={batch.payee?.sector || '—'} />
                  <Info
                    label="Request date"
                    value={batch.payee?.commissionRequestDate || '—'}
                  />
                  <Info label="Bank" value={batch.payee?.bankName?.trim() || '—'} />
                  <Info
                    label="Account"
                    value={batch.payee?.bankAccountNumber?.trim() || '—'}
                  />
                  <Info label="Period" value={batch.periodLabel || '—'} />
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Original claim form
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Uploaded workbook used to create this batch — open it to
                      verify lines against the source document.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {documentUrl ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewerOpen(true)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Button>
                        <a
                          href={documentUrl}
                          download={documentName}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex"
                        >
                          <Button size="sm" variant="outline">
                            <Download className="mr-1.5 h-3.5 w-3.5" />
                            Download
                          </Button>
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex items-start gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3">
                  <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {documentName}
                    </p>
                    {documentUrl ? (
                      <p className="mt-0.5 break-all text-xs text-slate-500">
                        {documentUrl}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-amber-700">
                        File name only is stored on this batch. Backend must
                        return `sourceDocumentUrl` for viewing.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  Financial summary
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                  <Info label="Total commission" value={formatRwf(totalCommission)} />
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
                <h3 className="mb-2 text-sm font-semibold text-slate-800">
                  Lines ({batch.lineCount})
                </h3>
                {isLoading ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-8 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refreshing lines…
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-max w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          {COMMISSION_LINE_COLUMN_KEYS.map((key) => (
                            <th
                              key={key}
                              className="whitespace-nowrap px-3 py-2 font-medium"
                            >
                              {COMMISSION_LINE_COLUMN_LABELS[key]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {batch.lines.map((line) => (
                          <tr key={line.id} className="border-t border-slate-100">
                            {COMMISSION_LINE_COLUMN_KEYS.map((key) => (
                              <td
                                key={key}
                                className={`whitespace-nowrap px-3 py-2 ${
                                  key === 'contract' ? 'font-mono text-[11px]' : ''
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
          <div className="border-t border-slate-200 px-5 py-4">{footer}</div>
        ) : null}
      </div>

      {viewerOpen && documentUrl ? (
        <DocumentViewer
          documentName={documentName}
          documentPath={documentUrl}
          onClose={() => setViewerOpen(false)}
        />
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-900 break-all">{value}</p>
    </div>
  );
}
