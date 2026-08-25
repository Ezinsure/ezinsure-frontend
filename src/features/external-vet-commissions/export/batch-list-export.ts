import type { ExportColumn } from '@/shared/export/types';
import { exportTableToExcel, exportTableToPdf } from '@/shared/export/table-export';
import {
  formatExportDate,
  formatRwfExportNumber,
} from '@/shared/export/formatters';
import {
  EXTERNAL_VET_STATUS_LABELS,
  type ExternalVetCommissionBatchSummary,
  type ExternalVetsHubTab,
} from '../domain';

const BATCH_EXPORT_COLUMNS: ExportColumn<ExternalVetCommissionBatchSummary>[] = [
  {
    header: 'Batch',
    getValue: (row) => row.batchNumber,
    pdfWidth: 28,
  },
  {
    header: 'Vet name',
    getValue: (row) => row.payee?.name ?? '—',
    pdfWidth: 32,
  },
  {
    header: 'Phone',
    getValue: (row) => row.payee?.phoneNumber ?? '—',
    pdfWidth: 26,
  },
  {
    header: 'Bank',
    getValue: (row) => row.payee?.bankName ?? '—',
    pdfWidth: 24,
  },
  {
    header: 'Account',
    getValue: (row) => row.payee?.bankAccountNumber ?? '—',
    pdfWidth: 28,
  },
  {
    header: 'Period',
    getValue: (row) => row.periodLabel || '—',
    pdfWidth: 28,
  },
  {
    header: 'Lines',
    getValue: (row) => row.lineCount,
    pdfWidth: 14,
  },
  {
    header: 'Vet commission (RWF)',
    getValue: (row) => formatRwfExportNumber(row.totalVetCommission),
    pdfWidth: 28,
  },
  {
    header: 'Company commission (RWF)',
    getValue: (row) => formatRwfExportNumber(row.totalCompanyCommission),
    pdfWidth: 30,
  },
  {
    header: 'Status',
    getValue: (row) => EXTERNAL_VET_STATUS_LABELS[row.status] ?? row.status,
    pdfWidth: 30,
  },
  {
    header: 'Created',
    getValue: (row) => formatExportDate(row.createdAt),
    pdfWidth: 22,
  },
  {
    header: 'Created by',
    getValue: (row) => row.createdByName || '—',
    pdfWidth: 26,
  },
  {
    header: 'Source file',
    getValue: (row) => row.sourceFileName || '—',
    pdfWidth: 34,
  },
];

export function exportTabLabel(tab: ExternalVetsHubTab): string {
  switch (tab) {
    case 'admin-review':
      return 'Admin Review';
    case 'payments':
      return 'Ready to Pay';
    case 'initiated':
      return 'Payment Initiated';
    case 'history':
      return 'Paid History';
    case 'applications':
      return 'Applications';
    default:
      return 'Batches';
  }
}

export function exportFilenameBase(tab: ExternalVetsHubTab): string {
  switch (tab) {
    case 'admin-review':
      return 'external_vet_admin_review';
    case 'payments':
      return 'external_vet_ready_to_pay';
    case 'initiated':
      return 'external_vet_payment_initiated';
    case 'history':
      return 'external_vet_paid_history';
    case 'applications':
      return 'external_vet_applications';
    default:
      return 'external_vet_batches';
  }
}

export interface ExternalVetBatchExportOptions {
  rows: ExternalVetCommissionBatchSummary[];
  tab: ExternalVetsHubTab;
  startDate?: string;
  endDate?: string;
  search?: string;
}

function buildReportMeta(options: ExternalVetBatchExportOptions) {
  const tabLabel = exportTabLabel(options.tab);
  const totalVet = options.rows.reduce((sum, row) => sum + (row.totalVetCommission || 0), 0);
  const totalCompany = options.rows.reduce(
    (sum, row) => sum + (row.totalCompanyCommission || 0),
    0,
  );

  const contextLines: string[] = [];
  if (options.startDate || options.endDate) {
    contextLines.push(
      `Date range: ${options.startDate || '…'} → ${options.endDate || '…'}`,
    );
  }
  if (options.search?.trim()) {
    contextLines.push(`Search: ${options.search.trim()}`);
  }

  return {
    title: `External Vet Commissions — ${tabLabel}`,
    subtitle: 'SONARWA commission batches (outside normal livestock applications)',
    contextLines: contextLines.length ? contextLines : undefined,
    summaryLines: [
      `Batches: ${options.rows.length}`,
      `Vet commission total: ${totalVet.toLocaleString('en-US')} RWF`,
      `Company commission total: ${totalCompany.toLocaleString('en-US')} RWF`,
    ],
    filenameBase: exportFilenameBase(options.tab),
    sheetName: tabLabel.slice(0, 31),
    columns: BATCH_EXPORT_COLUMNS,
    rows: options.rows,
  };
}

export async function exportExternalVetBatchesToExcel(
  options: ExternalVetBatchExportOptions,
): Promise<void> {
  await exportTableToExcel(buildReportMeta(options));
}

export async function exportExternalVetBatchesToPdf(
  options: ExternalVetBatchExportOptions,
): Promise<void> {
  await exportTableToPdf(buildReportMeta(options));
}

/** Inclusive calendar-day filter on batch createdAt (local). */
export function batchCreatedInDateRange(
  createdAt: string,
  startDate?: string,
  endDate?: string,
): boolean {
  if (!startDate && !endDate) return true;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;

  const day = new Date(created.getFullYear(), created.getMonth(), created.getDate());

  if (startDate) {
    const [y, m, d] = startDate.split('-').map(Number);
    const start = new Date(y, (m || 1) - 1, d || 1);
    if (day.getTime() < start.getTime()) return false;
  }
  if (endDate) {
    const [y, m, d] = endDate.split('-').map(Number);
    const end = new Date(y, (m || 1) - 1, d || 1);
    if (day.getTime() > end.getTime()) return false;
  }
  return true;
}
