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
  commissionLineColumnsForAudience,
  type ExternalVetCommissionBatch,
  type ExternalVetCommissionLine,
  type ExternalVetsViewRole,
} from '../domain';

const MONEY_KEYS = new Set([
  'sumInsured',
  'netPremium',
  'vetCommission',
  'companyCommission',
]);

function lineExportColumns(
  includeCompanyCommission: boolean,
): ExportColumn<ExternalVetCommissionLine>[] {
  const keys = includeCompanyCommission
    ? [...COMMISSION_LINE_COLUMN_KEYS]
    : commissionLineColumnsForAudience('vet');
  return keys.map((key) => ({
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
      key === 'contract' || key === 'microchipNumber'
        ? 26
        : key === 'clientName' || key === 'branch'
          ? 24
          : key === 'typeLivestock'
            ? 20
            : key === 'sn'
              ? 10
              : 16,
  }));
}

export interface ExternalVetBatchDetailExportOptions {
  /** When false, omit company commission % / totals / line column (vet exports). Default true. */
  includeCompanyCommission?: boolean;
  viewRole?: ExternalVetsViewRole;
}

function resolveIncludeCompanyCommission(
  options?: ExternalVetBatchDetailExportOptions,
): boolean {
  if (options?.includeCompanyCommission != null) {
    return options.includeCompanyCommission;
  }
  if (options?.viewRole === 'vet') return false;
  return true;
}

function buildBatchSummaryLines(
  batch: ExternalVetCommissionBatch,
  includeCompanyCommission: boolean,
): string[] {
  return [
    `Batch: ${batch.batchNumber}`,
    `Status: ${EXTERNAL_VET_STATUS_LABELS[batch.status] ?? batch.status}`,
    `External vet: ${batch.payee?.name ?? '—'}`,
    `Phone: ${batch.payee?.phoneNumber ?? '—'}`,
    `Bank: ${batch.payee?.bankName?.trim() || '—'}`,
    `Account: ${batch.payee?.bankAccountNumber?.trim() || '—'}`,
    `Period: ${batch.periodLabel || '—'}`,
    ...(includeCompanyCommission
      ? [`Company commission %: ${batch.companyCommissionPercent}%`]
      : []),
    `Lines: ${batch.lineCount}`,
    `Vet commission total: ${Number(batch.totalVetCommission || 0).toLocaleString('en-US')} RWF`,
    ...(includeCompanyCommission
      ? [
          `Company commission total: ${Number(batch.totalCompanyCommission || 0).toLocaleString('en-US')} RWF`,
        ]
      : []),
    `Created by: ${batch.createdByName || '—'}`,
    `Created at: ${formatExportDate(batch.createdAt)}`,
    ...(batch.reviewedByName ? [`Reviewed by: ${batch.reviewedByName}`] : []),
    ...(batch.reviewNote ? [`Review note: ${batch.reviewNote}`] : []),
    ...(batch.paidByName ? [`Paid by: ${batch.paidByName}`] : []),
    `Source file: ${batch.sourceFileName || '—'}`,
  ];
}

function buildBatchReportMeta(
  batch: ExternalVetCommissionBatch,
  options?: ExternalVetBatchDetailExportOptions,
) {
  const includeCompanyCommission = resolveIncludeCompanyCommission(options);
  const lines = batch.lines ?? [];
  return {
    title: `External Vet Commission Batch — ${batch.batchNumber}`,
    subtitle: 'Batch detail with line-level commissions and payout summary',
    contextLines: [
      `Vet: ${batch.payee?.name ?? '—'} (${batch.payee?.phoneNumber ?? '—'})`,
      `Status: ${EXTERNAL_VET_STATUS_LABELS[batch.status] ?? batch.status}`,
      ...(batch.periodLabel ? [`Period: ${batch.periodLabel}`] : []),
    ],
    summaryLines: buildBatchSummaryLines(batch, includeCompanyCommission),
    filenameBase: `external_vet_batch_${batch.batchNumber}`,
    sheetName: 'Lines',
    columns: lineExportColumns(includeCompanyCommission),
    rows: lines,
    pdfOrientation: 'landscape' as const,
  };
}

export async function exportExternalVetBatchDetailToExcel(
  batch: ExternalVetCommissionBatch,
  options?: ExternalVetBatchDetailExportOptions,
): Promise<void> {
  if (!batch.lines?.length) {
    throw new Error('No commission lines to export');
  }
  await exportTableToExcel(buildBatchReportMeta(batch, options));
}

export async function exportExternalVetBatchDetailToPdf(
  batch: ExternalVetCommissionBatch,
  options?: ExternalVetBatchDetailExportOptions,
): Promise<void> {
  if (!batch.lines?.length) {
    throw new Error('No commission lines to export');
  }
  await exportTableToPdf(buildBatchReportMeta(batch, options));
}
