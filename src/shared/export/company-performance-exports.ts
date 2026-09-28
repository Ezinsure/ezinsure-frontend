import type { ExportColumn } from '@/shared/export/types';
import { exportTableToPdf } from '@/shared/export/table-export';
import {
  buildExportTimestamp,
  formatApplicationStatus,
  formatExportDate,
  formatRwfExport,
  formatRwfExportNumber,
  sanitizeFilenameSegment,
} from '@/shared/export/formatters';

export interface CompanyPerformanceExportRow {
  applicationNumber: string;
  clientName: string;
  channel: string;
  performerName: string;
  insuranceCategory: string;
  status: string;
  submittedAt: string;
  policeNumber: string;
  /** Total billed amount (not net premium). */
  amount: number;
  /** True net premium from API `netPremium`. */
  netPremium: number;
  companyCommission: number;
  administrationFees: number;
}

export interface CompanyPerformanceExportParams {
  rows: CompanyPerformanceExportRow[];
  startDate: string;
  endDate: string;
  searchQuery?: string;
  statusFilter?: string;
}

export interface CompanyPerformanceExportSummary {
  applicationCount: number;
  totalAmount: number;
  totalNetPremium: number;
  totalCompanyCommission: number;
  totalAdministrationFees: number;
}

const COMPANY_PERFORMANCE_COLUMNS: ExportColumn<CompanyPerformanceExportRow>[] = [
  { header: 'Application #', getValue: (r) => r.applicationNumber, pdfWidth: 26 },
  { header: 'Client', getValue: (r) => r.clientName, pdfWidth: 28 },
  { header: 'Channel', getValue: (r) => r.channel, pdfWidth: 16 },
  { header: 'Performed by', getValue: (r) => r.performerName, pdfWidth: 24 },
  { header: 'Category', getValue: (r) => r.insuranceCategory, pdfWidth: 22 },
  { header: 'Status', getValue: (r) => formatApplicationStatus(r.status), pdfWidth: 24 },
  { header: 'Police Number', getValue: (r) => r.policeNumber, pdfWidth: 22 },
  { header: 'Submitted', getValue: (r) => formatExportDate(r.submittedAt), pdfWidth: 20 },
  {
    header: 'Amount (RWF)',
    getValue: (r) => formatRwfExportNumber(r.amount),
    pdfWidth: 24,
  },
  {
    header: 'Net premium (RWF)',
    getValue: (r) => formatRwfExportNumber(r.netPremium),
    pdfWidth: 26,
  },
  {
    header: 'Company commission (RWF)',
    getValue: (r) => formatRwfExportNumber(r.companyCommission),
    pdfWidth: 28,
  },
];

function buildCompanyPerformanceContext(params: CompanyPerformanceExportParams): string[] {
  const lines = [`Date range: ${params.startDate} to ${params.endDate}`];
  if (params.statusFilter && params.statusFilter !== 'all') {
    lines.push(`Status: ${formatApplicationStatus(params.statusFilter)}`);
  }
  if (params.searchQuery?.trim()) {
    lines.push(`Search: ${params.searchQuery.trim()}`);
  }
  return lines;
}

export function buildCompanyPerformanceSummary(
  rows: CompanyPerformanceExportRow[],
): CompanyPerformanceExportSummary {
  return {
    applicationCount: rows.length,
    totalAmount: rows.reduce((sum, row) => sum + row.amount, 0),
    totalNetPremium: rows.reduce((sum, row) => sum + row.netPremium, 0),
    totalCompanyCommission: rows.reduce((sum, row) => sum + row.companyCommission, 0),
    totalAdministrationFees: rows.reduce((sum, row) => sum + row.administrationFees, 0),
  };
}

function buildCompanyPerformanceSummaryLines(summary: CompanyPerformanceExportSummary): string[] {
  return [
    `Applications: ${summary.applicationCount}`,
    `Total amount: ${formatRwfExport(summary.totalAmount)}`,
    `Total net premium: ${formatRwfExport(summary.totalNetPremium)}`,
    `Total company commission: ${formatRwfExport(summary.totalCompanyCommission)}`,
    `Total administration fees: ${formatRwfExport(summary.totalAdministrationFees)}`,
  ];
}

function buildFilenameBase(): string {
  return `company_performance_${sanitizeFilenameSegment('motor')}`;
}

function buildFilename(extension: 'xlsx' | 'pdf'): string {
  return `${buildFilenameBase()}_${buildExportTimestamp()}.${extension}`;
}

export async function exportCompanyPerformanceToExcel(
  params: CompanyPerformanceExportParams,
): Promise<void> {
  if (params.rows.length === 0) {
    throw new Error('No data to export');
  }

  const XLSX = await import('@e965/xlsx');
  const summary = buildCompanyPerformanceSummary(params.rows);

  const sheetRows = params.rows.map((row) => {
    const record: Record<string, string | number> = {};
    for (const column of COMPANY_PERFORMANCE_COLUMNS) {
      record[column.header] = column.getValue(row);
    }
    return record;
  });

  sheetRows.push({});
  sheetRows.push({ 'Application #': 'TOTALS' });
  sheetRows.push({
    'Application #': 'Applications',
    Client: summary.applicationCount,
  });
  sheetRows.push({
    'Application #': 'Total amount (RWF)',
    Client: formatRwfExportNumber(summary.totalAmount),
  });
  sheetRows.push({
    'Application #': 'Total net premium (RWF)',
    Client: formatRwfExportNumber(summary.totalNetPremium),
  });
  sheetRows.push({
    'Application #': 'Total company commission (RWF)',
    Client: formatRwfExportNumber(summary.totalCompanyCommission),
  });
  sheetRows.push({
    'Application #': 'Total administration fees (RWF)',
    Client: formatRwfExportNumber(summary.totalAdministrationFees),
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Company Performance');

  XLSX.writeFile(workbook, buildFilename('xlsx'));
}

export async function exportCompanyPerformanceToPdf(
  params: CompanyPerformanceExportParams,
): Promise<void> {
  const summary = buildCompanyPerformanceSummary(params.rows);

  await exportTableToPdf({
    title: 'EZInsure Company Performance',
    subtitle: 'Direct-channel motor applications · Admin & Client',
    filenameBase: buildFilenameBase(),
    columns: COMPANY_PERFORMANCE_COLUMNS,
    rows: params.rows,
    contextLines: buildCompanyPerformanceContext(params),
    summaryLines: buildCompanyPerformanceSummaryLines(summary),
    pdfOrientation: 'landscape',
  });
}
