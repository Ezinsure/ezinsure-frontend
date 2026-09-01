import type { ExportColumn } from '@/shared/export/types';
import { exportTableToExcel, exportTableToPdf } from '@/shared/export/table-export';
import {
  formatExportDate,
  formatRwfExportNumber,
} from '@/shared/export/formatters';
import {
  COMMISSION_LINE_COLUMN_KEYS,
  COMMISSION_LINE_COLUMN_LABELS,
  EXTERNAL_VET_STATUS_LABELS,
  type ExternalVetCommissionBatch,
  type ExternalVetCommissionLine,
} from '../domain';

const MONEY_KEYS = new Set([
  'sumInsured',
  'netPremium',
  'vetCommission',
  'companyCommission',
]);

const LINE_EXPORT_COLUMNS: ExportColumn<ExternalVetCommissionLine>[] =
  COMMISSION_LINE_COLUMN_KEYS.map((key) => ({
    header: COMMISSION_LINE_COLUMN_LABELS[key],
    getValue: (row) => {
      const value = row[key];
      if (MONEY_KEYS.has(key)) {
        return formatRwfExportNumber(Number(value ?? 0));
      }
      if (typeof value === 'number') return value;
      return String(value ?? '');
    },
    pdfWidth:
      key === 'contract'
        ? 28
        : key === 'clientName' || key === 'agent'
          ? 24
          : key === 'typeLivestock'
            ? 22
            : 16,
  }));

function buildBatchSummaryLines(batch: ExternalVetCommissionBatch): string[] {
  return [
    `Batch: ${batch.batchNumber}`,
    `Status: ${EXTERNAL_VET_STATUS_LABELS[batch.status] ?? batch.status}`,
    `External vet: ${batch.payee?.name ?? '—'}`,
    `Phone: ${batch.payee?.phoneNumber ?? '—'}`,
    `Bank: ${batch.payee?.bankName?.trim() || '—'}`,
    `Account: ${batch.payee?.bankAccountNumber?.trim() || '—'}`,
    `Period: ${batch.periodLabel || '—'}`,
    `Company commission %: ${batch.companyCommissionPercent}%`,
    `Lines: ${batch.lineCount}`,
    `Vet commission total: ${Number(batch.totalVetCommission || 0).toLocaleString('en-US')} RWF`,
    `Company commission total: ${Number(batch.totalCompanyCommission || 0).toLocaleString('en-US')} RWF`,
    `Created by: ${batch.createdByName || '—'}`,
    `Created at: ${formatExportDate(batch.createdAt)}`,
    ...(batch.reviewedByName ? [`Reviewed by: ${batch.reviewedByName}`] : []),
    ...(batch.reviewNote ? [`Review note: ${batch.reviewNote}`] : []),
    ...(batch.paidByName ? [`Paid by: ${batch.paidByName}`] : []),
    `Source file: ${batch.sourceFileName || '—'}`,
  ];
}

function buildBatchReportMeta(batch: ExternalVetCommissionBatch) {
  const lines = batch.lines ?? [];
  return {
    title: `External Vet Commission Batch — ${batch.batchNumber}`,
    subtitle: 'Batch detail with line-level commissions and payout summary',
    contextLines: [
      `Vet: ${batch.payee?.name ?? '—'} (${batch.payee?.phoneNumber ?? '—'})`,
      `Status: ${EXTERNAL_VET_STATUS_LABELS[batch.status] ?? batch.status}`,
      ...(batch.periodLabel ? [`Period: ${batch.periodLabel}`] : []),
    ],
    summaryLines: buildBatchSummaryLines(batch),
    filenameBase: `external_vet_batch_${batch.batchNumber}`,
    sheetName: 'Lines',
    columns: LINE_EXPORT_COLUMNS,
    rows: lines,
    pdfOrientation: 'landscape' as const,
  };
}

export async function exportExternalVetBatchDetailToExcel(
  batch: ExternalVetCommissionBatch,
): Promise<void> {
  if (!batch.lines?.length) {
    throw new Error('No commission lines to export');
  }
  await exportTableToExcel(buildBatchReportMeta(batch));
}

export async function exportExternalVetBatchDetailToPdf(
  batch: ExternalVetCommissionBatch,
): Promise<void> {
  if (!batch.lines?.length) {
    throw new Error('No commission lines to export');
  }
  await exportTableToPdf(buildBatchReportMeta(batch));
}
