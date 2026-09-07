import type { ExportColumn } from '@/shared/export/types';
import { exportTableToExcel, exportTableToPdf } from '@/shared/export/table-export';
import { formatRwfExportNumber } from '@/shared/export/formatters';
import {
  EXTERNAL_VET_STATUS_LABELS,
  summarizeCommissionLines,
  type ExternalVetCommissionLineListItem,
  type ExternalVetCommissionStatus,
} from '../domain';

/**
 * Finance verification columns: animal-owner payment proof + vet identifiers.
 * Excel includes a fuller set; PDF uses a landscape-friendly subset.
 */
const EXCEL_LINE_COLUMNS: ExportColumn<ExternalVetCommissionLineListItem>[] = [
  {
    header: 'Vet name',
    getValue: (row) => row.payee?.name ?? '—',
  },
  {
    header: 'Vet phone',
    getValue: (row) => row.payee?.phoneNumber ?? '—',
  },
  {
    header: 'Client ID/NO',
    getValue: (row) => row.clientId || '—',
  },
  {
    header: 'Client name',
    getValue: (row) => row.clientName || '—',
  },
  {
    header: 'Client district',
    getValue: (row) => row.clientDistrict || '—',
  },
  {
    header: 'Client sector',
    getValue: (row) => row.clientSector || '—',
  },
  {
    header: 'Contract',
    getValue: (row) => row.contract || '—',
  },
  {
    header: 'Microchip / Tag',
    getValue: (row) => row.microchipNumber || '—',
  },
  {
    header: 'Branch',
    getValue: (row) => row.branch || '—',
  },
  {
    header: 'ProdDate',
    getValue: (row) => row.prodDate || '—',
  },
  {
    header: 'EffecDate',
    getValue: (row) => row.effecDate || '—',
  },
  {
    header: 'ExpiryDate',
    getValue: (row) => row.expiryDate || '—',
  },
  {
    header: 'Type Livestock',
    getValue: (row) => row.typeLivestock || '—',
  },
  {
    header: 'Net premium (RWF)',
    getValue: (row) => formatRwfExportNumber(row.netPremium),
  },
  {
    header: 'Sum insured (RWF)',
    getValue: (row) => formatRwfExportNumber(row.sumInsured),
  },
  {
    header: 'Vet commission (RWF)',
    getValue: (row) => formatRwfExportNumber(row.vetCommission),
  },
  {
    header: 'Company commission (RWF)',
    getValue: (row) => formatRwfExportNumber(row.companyCommission),
  },
  {
    header: 'Batch',
    getValue: (row) => row.batchNumber,
  },
  {
    header: 'Status',
    getValue: (row) =>
      EXTERNAL_VET_STATUS_LABELS[row.batchStatus] ?? row.batchStatus,
  },
  {
    header: 'Period',
    getValue: (row) => row.periodLabel || '—',
  },
];

const PDF_LINE_COLUMNS: ExportColumn<ExternalVetCommissionLineListItem>[] = [
  {
    header: 'Vet',
    getValue: (row) => row.payee?.name ?? '—',
    pdfWidth: 26,
  },
  {
    header: 'Client ID',
    getValue: (row) => row.clientId || '—',
    pdfWidth: 20,
  },
  {
    header: 'Client name',
    getValue: (row) => row.clientName || '—',
    pdfWidth: 26,
  },
  {
    header: 'District',
    getValue: (row) => row.clientDistrict || '—',
    pdfWidth: 18,
  },
  {
    header: 'Contract',
    getValue: (row) => row.contract || '—',
    pdfWidth: 22,
  },
  {
    header: 'Branch',
    getValue: (row) => row.branch || '—',
    pdfWidth: 18,
  },
  {
    header: 'ProdDate',
    getValue: (row) => row.prodDate || '—',
    pdfWidth: 20,
  },
  {
    header: 'Net premium',
    getValue: (row) => formatRwfExportNumber(row.netPremium),
    pdfWidth: 22,
  },
  {
    header: 'Vet comm.',
    getValue: (row) => formatRwfExportNumber(row.vetCommission),
    pdfWidth: 20,
  },
  {
    header: 'Co. comm.',
    getValue: (row) => formatRwfExportNumber(row.companyCommission),
    pdfWidth: 20,
  },
  {
    header: 'Batch',
    getValue: (row) => row.batchNumber,
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

function buildReportMeta(
  options: ExternalVetLinesExportOptions,
  format: 'excel' | 'pdf',
) {
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

  return {
    title: `External Vet Commissions — ${purposeTitle(options.purpose)}`,
    subtitle:
      'Line-level ledger for verifying owner payment and SONARWA reclaim',
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
    columns: format === 'pdf' ? PDF_LINE_COLUMNS : EXCEL_LINE_COLUMNS,
    rows: options.rows,
  };
}

export async function exportExternalVetLinesToExcel(
  options: ExternalVetLinesExportOptions,
): Promise<void> {
  await exportTableToExcel(buildReportMeta(options, 'excel'));
}

export async function exportExternalVetLinesToPdf(
  options: ExternalVetLinesExportOptions,
): Promise<void> {
  await exportTableToPdf(buildReportMeta(options, 'pdf'));
}
