import type { ExportColumn } from '@/shared/export/types';
import { exportTableToExcel, exportTableToPdf } from '@/shared/export/table-export';
import {
  formatExportDate,
  formatRwfExportNumber,
} from '@/shared/export/formatters';
import {
  EXTERNAL_VET_STATUS_LABELS,
  summarizeCommissionLines,
  type ExternalVetCommissionLineListItem,
  type ExternalVetCommissionStatus,
} from '../domain';

const LINE_EXPORT_COLUMNS: ExportColumn<ExternalVetCommissionLineListItem>[] = [
  {
    header: 'Batch',
    getValue: (row) => row.batchNumber,
    pdfWidth: 24,
  },
  {
    header: 'Status',
    getValue: (row) =>
      EXTERNAL_VET_STATUS_LABELS[row.batchStatus] ?? row.batchStatus,
    pdfWidth: 30,
  },
  {
    header: 'Vet name',
    getValue: (row) => row.payee?.name ?? '—',
    pdfWidth: 28,
  },
  {
    header: 'Phone',
    getValue: (row) => row.payee?.phoneNumber ?? '—',
    pdfWidth: 22,
  },
  {
    header: 'Bank',
    getValue: (row) => row.payee?.bankName ?? '—',
    pdfWidth: 22,
  },
  {
    header: 'Account',
    getValue: (row) => row.payee?.bankAccountNumber ?? '—',
    pdfWidth: 24,
  },
  {
    header: 'Period',
    getValue: (row) => row.periodLabel || '—',
    pdfWidth: 22,
  },
  {
    header: 'S/N',
    getValue: (row) => row.sn,
    pdfWidth: 12,
  },
  {
    header: 'ProdDate',
    getValue: (row) => row.prodDate || '—',
    pdfWidth: 20,
  },
  {
    header: 'Branch',
    getValue: (row) => row.branch || '—',
    pdfWidth: 18,
  },
  {
    header: 'EffecDate',
    getValue: (row) => row.effecDate || '—',
    pdfWidth: 20,
  },
  {
    header: 'ExpiryDate',
    getValue: (row) => row.expiryDate || '—',
    pdfWidth: 20,
  },
  {
    header: 'Contract',
    getValue: (row) => row.contract || '—',
    pdfWidth: 22,
  },
  {
    header: 'Type Livestock',
    getValue: (row) => row.typeLivestock || '—',
    pdfWidth: 22,
  },
  {
    header: 'ClientID',
    getValue: (row) => row.clientId || '—',
    pdfWidth: 20,
  },
  {
    header: 'ClientName',
    getValue: (row) => row.clientName || '—',
    pdfWidth: 28,
  },
  {
    header: 'Agent',
    getValue: (row) => row.agent || '—',
    pdfWidth: 22,
  },
  {
    header: 'SumInsured (RWF)',
    getValue: (row) => formatRwfExportNumber(row.sumInsured),
    pdfWidth: 24,
  },
  {
    header: 'NetPremium (RWF)',
    getValue: (row) => formatRwfExportNumber(row.netPremium),
    pdfWidth: 24,
  },
  {
    header: 'Vet commission (RWF)',
    getValue: (row) => formatRwfExportNumber(row.vetCommission),
    pdfWidth: 26,
  },
  {
    header: 'Company commission (RWF)',
    getValue: (row) => formatRwfExportNumber(row.companyCommission),
    pdfWidth: 28,
  },
  {
    header: 'UserName',
    getValue: (row) => row.userName || '—',
    pdfWidth: 22,
  },
  {
    header: 'Batch created',
    getValue: (row) => formatExportDate(row.batchCreatedAt),
    pdfWidth: 22,
  },
  {
    header: 'Paid at',
    getValue: (row) => (row.paidAt ? formatExportDate(row.paidAt) : '—'),
    pdfWidth: 22,
  },
];

export interface ExternalVetLinesExportOptions {
  rows: ExternalVetCommissionLineListItem[];
  startDate?: string;
  endDate?: string;
  status?: ExternalVetCommissionStatus | 'ALL';
  search?: string;
  purpose?: 'reclaim' | 'review' | 'reimbursed';
}

function purposeTitle(purpose?: ExternalVetLinesExportOptions['purpose']): string {
  switch (purpose) {
    case 'reclaim':
      return 'SONARWA Reclaim File';
    case 'reimbursed':
      return 'SONARWA Reimbursed Lines';
    default:
      return 'Commission Lines';
  }
}

function buildReportMeta(options: ExternalVetLinesExportOptions) {
  const summary = summarizeCommissionLines(options.rows);
  const statusLabel =
    options.status && options.status !== 'ALL'
      ? EXTERNAL_VET_STATUS_LABELS[options.status]
      : 'Paid / awaiting / reimbursed';

  const contextLines: string[] = [`Status filter: ${statusLabel}`];
  if (options.startDate || options.endDate) {
    contextLines.push(
      `Date range: ${options.startDate || '…'} → ${options.endDate || '…'}`,
    );
  }
  if (options.search?.trim()) {
    contextLines.push(`Search: ${options.search.trim()}`);
  }

  const title = `External Vet Commissions — ${purposeTitle(options.purpose)}`;

  return {
    title,
    subtitle:
      'Line-level SONARWA commission ledger for finance reclaim and reimbursement',
    contextLines,
    summaryLines: [
      `Lines: ${summary.lineCount}`,
      `Batches: ${summary.batchCount}`,
      `External vets: ${summary.vetCount}`,
      `Vet commission total: ${summary.totalVetCommission.toLocaleString('en-US')} RWF`,
      `Company commission total: ${summary.totalCompanyCommission.toLocaleString('en-US')} RWF`,
    ],
    filenameBase:
      options.purpose === 'reclaim'
        ? 'sonarwa_reclaim_lines'
        : options.purpose === 'reimbursed'
          ? 'sonarwa_reimbursed_lines'
          : 'external_vet_commission_lines',
    sheetName: 'Lines',
    columns: LINE_EXPORT_COLUMNS,
    rows: options.rows,
  };
}

export async function exportExternalVetLinesToExcel(
  options: ExternalVetLinesExportOptions,
): Promise<void> {
  await exportTableToExcel(buildReportMeta(options));
}

export async function exportExternalVetLinesToPdf(
  options: ExternalVetLinesExportOptions,
): Promise<void> {
  await exportTableToPdf(buildReportMeta(options));
}
