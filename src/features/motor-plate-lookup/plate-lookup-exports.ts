import type { ExportColumn } from '@/shared/export/types';
import { exportTableToExcel, exportTableToPdf } from '@/shared/export/table-export';
import {
  formatApplicationStatus,
  formatExportDate,
  formatRwfExport,
  formatRwfExportNumber,
  sanitizeFilenameSegment,
} from '@/shared/export/formatters';
import type { PlateLookupStats } from '@/features/motor-plate-lookup/types';

export interface PlateLookupExportRow {
  applicationNumber: string;
  submittedAt: string;
  clientName: string;
  insuranceCategory: string;
  status: string;
  netPremium: number;
  amount: number;
  performedByKind: string;
  performedByName: string;
  policeNumber: string;
}

export interface PlateLookupExportParams {
  rows: PlateLookupExportRow[];
  plateNumber: string;
  startDate: string;
  endDate: string;
  stats: PlateLookupStats;
}

const COLUMNS: ExportColumn<PlateLookupExportRow>[] = [
  { header: 'Application #', getValue: (r) => r.applicationNumber, pdfWidth: 26 },
  { header: 'Submitted', getValue: (r) => formatExportDate(r.submittedAt), pdfWidth: 20 },
  { header: 'Client', getValue: (r) => r.clientName, pdfWidth: 28 },
  { header: 'Category', getValue: (r) => r.insuranceCategory, pdfWidth: 22 },
  {
    header: 'Status',
    getValue: (r) => formatApplicationStatus(r.status),
    pdfWidth: 24,
  },
  {
    header: 'Net premium (RWF)',
    getValue: (r) => formatRwfExportNumber(r.netPremium),
    pdfWidth: 26,
  },
  {
    header: 'Amount (RWF)',
    getValue: (r) => formatRwfExportNumber(r.amount),
    pdfWidth: 24,
  },
  { header: 'Performed by', getValue: (r) => r.performedByKind, pdfWidth: 16 },
  { header: 'Performer name', getValue: (r) => r.performedByName, pdfWidth: 26 },
  { header: 'Police number', getValue: (r) => r.policeNumber, pdfWidth: 22 },
];

function contextLines(params: PlateLookupExportParams): string[] {
  return [
    `Plate number: ${params.plateNumber}`,
    `Date range: ${params.startDate} to ${params.endDate}`,
  ];
}

function summaryLines(stats: PlateLookupStats): string[] {
  return [
    `Applications: ${stats.applicationCount}`,
    `Total net premium: ${formatRwfExport(stats.totalNetPremium)}`,
    `Total amount paid: ${formatRwfExport(stats.totalAmountPaid)}`,
  ];
}

function filenameBase(plateNumber: string): string {
  return `plate_lookup_${sanitizeFilenameSegment(plateNumber || 'motor')}`;
}

export async function exportPlateLookupToExcel(
  params: PlateLookupExportParams,
): Promise<void> {
  await exportTableToExcel({
    title: 'Motor Plate Lookup',
    subtitle: `Applications for plate ${params.plateNumber}`,
    filenameBase: filenameBase(params.plateNumber),
    sheetName: 'Plate Lookup',
    columns: COLUMNS,
    rows: params.rows,
    contextLines: contextLines(params),
    summaryLines: summaryLines(params.stats),
  });
}

export async function exportPlateLookupToPdf(
  params: PlateLookupExportParams,
): Promise<void> {
  await exportTableToPdf({
    title: 'Motor Plate Lookup',
    subtitle: `Applications for plate ${params.plateNumber}`,
    filenameBase: filenameBase(params.plateNumber),
    columns: COLUMNS,
    rows: params.rows,
    contextLines: contextLines(params),
    summaryLines: summaryLines(params.stats),
    pdfOrientation: 'landscape',
  });
}
