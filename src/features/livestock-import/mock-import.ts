import type {
  LivestockImportResult,
  LivestockImportRowResult,
  ParsedImportRow,
} from '@/features/livestock-import/types';

const MOCK_DELAY_MS = 1400;

function trimPolicyNumber(value: string): string {
  return value.trim();
}

function hasVetContact(row: ParsedImportRow): boolean {
  const phone = (row.values.vetPhone ?? '').trim();
  const email = (row.values.vetEmail ?? '').trim();
  return Boolean(phone && email);
}

function buildRowResult(row: ParsedImportRow, index: number): LivestockImportRowResult {
  const chip = (row.values.chip ?? '').trim() || `ROW-${row.rowNumber}`;
  const policyNumber = trimPolicyNumber(row.values.policyNumber ?? '');
  const ownerName = (row.values.ownerName ?? '').trim() || 'Unknown owner';
  const vetPhone = (row.values.vetPhone ?? '').trim();
  const vetEmail = (row.values.vetEmail ?? '').trim();

  const base = {
    rowNumber: row.rowNumber,
    chip,
    policyNumber,
    ownerName,
    vetPhone,
    vetEmail,
  };

  if (!chip || chip.startsWith('ROW-')) {
    return { ...base, status: 'failed', reason: 'Missing Chip (Tekana tag ID).' };
  }

  if (!hasVetContact(row)) {
    return {
      ...base,
      status: 'failed',
      reason: 'Vet Phone and Vet Email are required (add columns after Tekana export).',
    };
  }

  const mod = index % 10;
  if (mod === 7) {
    return {
      ...base,
      status: 'skipped',
      reason: 'Chip already linked to an active livestock application.',
    };
  }

  if (mod === 9) {
    return {
      ...base,
      status: 'failed',
      reason: 'Invalid Sum Assured or policy dates.',
    };
  }

  return {
    ...base,
    status: 'created',
    applicationNumber: `LS-${new Date().getFullYear()}-${String(10000 + index).slice(1)}`,
  };
}

function buildSyntheticRows(count: number): ParsedImportRow[] {
  return Array.from({ length: count }, (_, i) => ({
    rowNumber: i + 2,
    values: {
      chip: `956000007478${String(647 + i).padStart(3, '0')}`,
      policyNumber: `RY001MICD28${7000 + i}`,
      insuranceType: 'Renewal',
      sumAssured: '700000',
      species: 'Cow',
      breed: 'Fresian',
      sex: 'Female',
      ownerName: `Sample Farmer ${i + 1}`,
      ownerPhone: '788810914',
      district: 'Nyagatare',
      sector: 'GATUNDA',
      insurer: 'Radiant Insurance Company',
      tekanaStatus: 'Approved for Subsidy',
      vetPhone: '+250788123456',
      vetEmail: `vet${i + 1}@example.rw`,
    },
    raw: {},
  }));
}

export async function simulateTekanaImport(
  file: File,
  parsedRows: ParsedImportRow[],
  options?: { missingEzinsureHeaders?: string[] },
): Promise<LivestockImportResult> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

  if (options?.missingEzinsureHeaders?.length) {
    return {
      importBatchId: `batch_sim_${Date.now().toString(36)}`,
      message: 'Import blocked: Vet Phone and Vet Email columns are missing.',
      simulated: true,
      summary: {
        totalRows: 0,
        created: 0,
        skipped: 0,
        failed: 0,
        missingVetContact: 0,
      },
      rows: [],
      errors: [
        'Add these columns to your Tekana export before uploading:',
        ...options.missingEzinsureHeaders.map((h) => `• ${h}`),
      ],
    };
  }

  const isSpreadsheet = /\.(xlsx|xls)$/i.test(file.name);
  const rows =
    parsedRows.length > 0
      ? parsedRows
      : buildSyntheticRows(isSpreadsheet ? 14 : Math.max(6, Math.min(20, Math.round(file.size / 400))));

  const results = rows.map((row, index) => buildRowResult(row, index));

  const missingVetContact = results.filter(
    (r) => r.status === 'failed' && r.reason?.includes('Vet Phone'),
  ).length;

  const summary = {
    totalRows: results.length,
    created: results.filter((r) => r.status === 'created').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
    missingVetContact,
  };

  return {
    importBatchId: `batch_sim_${Date.now().toString(36)}`,
    message: isSpreadsheet
      ? 'Excel import simulated. Backend will parse .xlsx when the API is connected.'
      : 'Tekana CSV import simulated successfully.',
    simulated: true,
    summary,
    rows: results,
    errors: [
      ...(summary.failed > 0
        ? [`${summary.failed} row(s) failed validation.`]
        : []),
      ...(missingVetContact > 0
        ? [`${missingVetContact} row(s) missing Vet Phone or Vet Email.`]
        : []),
      ...(summary.skipped > 0
        ? [`${summary.skipped} row(s) skipped (duplicate chip).`]
        : []),
    ],
  };
}
