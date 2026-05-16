import type {
  LivestockImportResult,
  LivestockImportRowResult,
  ParsedImportRow,
} from '@/features/livestock-import/types';

const MOCK_DELAY_MS = 1400;

function pickStatus(index: number): LivestockImportRowResult['status'] {
  const mod = index % 10;
  if (mod === 7) return 'skipped';
  if (mod === 9) return 'failed';
  return 'created';
}

function buildRowResult(row: ParsedImportRow, index: number): LivestockImportRowResult {
  const tekanaTagId = row.values.tekanaTagId || `ROW-${row.rowNumber}`;
  const ownerFullName = row.values.ownerFullName || 'Unknown owner';
  const status = pickStatus(index);

  if (status === 'skipped') {
    return {
      rowNumber: row.rowNumber,
      tekanaTagId,
      ownerFullName,
      status,
      reason: 'Tekana tag already linked to an active application.',
    };
  }

  if (status === 'failed') {
    return {
      rowNumber: row.rowNumber,
      tekanaTagId,
      ownerFullName,
      status,
      reason: 'Invalid insured value or missing required field.',
    };
  }

  return {
    rowNumber: row.rowNumber,
    tekanaTagId,
    ownerFullName,
    status,
    applicationNumber: `LS-${new Date().getFullYear()}-${String(10000 + index).slice(1)}`,
  };
}

function buildSyntheticRows(count: number): ParsedImportRow[] {
  return Array.from({ length: count }, (_, i) => ({
    rowNumber: i + 2,
    values: {
      tekanaTagId: `RW-TK-SIM-${String(i + 1).padStart(4, '0')}`,
      ownerFullName: `Sample Farmer ${i + 1}`,
      ownerNationalId: '1199887766554433',
      ownerPhone: '+250788000000',
      province: 'Southern',
      district: 'Huye',
      sector: 'Ngoma',
      species: 'Cattle',
      breed: 'Ankole',
      sex: 'Female',
      ageMonths: '24',
      insuredValueRwf: '750000',
      coverageStartDate: '2026-06-01',
      coverageDurationMonths: '12',
      transactionReference: `MOMO-SIM-${i + 1}`,
    },
  }));
}

export async function simulateTekanaImport(
  file: File,
  parsedRows: ParsedImportRow[],
): Promise<LivestockImportResult> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

  const isSpreadsheet = /\.(xlsx|xls)$/i.test(file.name);
  const rows =
    parsedRows.length > 0
      ? parsedRows
      : buildSyntheticRows(isSpreadsheet ? 14 : Math.max(6, Math.min(20, Math.round(file.size / 400))));

  const results = rows.map((row, index) => buildRowResult(row, index));

  const summary = {
    totalRows: results.length,
    created: results.filter((r) => r.status === 'created').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
    duplicateTransactionRefs: results.filter(
      (r) => r.status === 'skipped' && r.reason?.includes('transaction'),
    ).length,
  };

  const duplicateRefNote =
    summary.duplicateTransactionRefs > 0
      ? `${summary.duplicateTransactionRefs} duplicate transaction reference(s) detected.`
      : null;

  return {
    importBatchId: `batch_sim_${Date.now().toString(36)}`,
    message: isSpreadsheet
      ? 'Excel import simulated successfully. Backend will parse .xlsx when the API is connected.'
      : 'CSV import simulated successfully.',
    simulated: true,
    summary,
    rows: results,
    errors: [
      ...(summary.failed > 0
        ? [`${summary.failed} row(s) failed validation and were not created.`]
        : []),
      ...(summary.skipped > 0
        ? [`${summary.skipped} row(s) skipped (duplicate Tekana tag or existing policy).`]
        : []),
      ...(duplicateRefNote ? [duplicateRefNote] : []),
    ],
  };
}
