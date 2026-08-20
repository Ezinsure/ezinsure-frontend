import type { ExternalVetCommissionLine } from './domain';

export type ParseCommissionSheetResult = {
  lines: Omit<ExternalVetCommissionLine, 'id'>[];
  totalCommission: number;
  errors: string[];
  warnings: string[];
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_/|-]+/g, '');
}

type LineField = keyof Omit<ExternalVetCommissionLine, 'id'>;

const HEADER_ALIASES: Record<string, LineField> = {
  sn: 'sn',
  s: 'sn',
  serial: 'sn',
  serialnumber: 'sn',
  proddate: 'prodDate',
  productiondate: 'prodDate',
  branch: 'branch',
  effecdate: 'effecDate',
  effectivedate: 'effecDate',
  expirydate: 'expiryDate',
  expdate: 'expiryDate',
  contract: 'contract',
  contractid: 'contract',
  typelivestock: 'typeLivestock',
  livestocktype: 'typeLivestock',
  type: 'typeLivestock',
  clientid: 'clientId',
  client: 'clientId',
  clientname: 'clientName',
  insuredname: 'clientName',
  agent: 'agent',
  suminsured: 'sumInsured',
  sumassured: 'sumInsured',
  netpremium: 'netPremium',
  premium: 'netPremium',
  commission: 'commission',
  username: 'userName',
  user: 'userName',
};

const REQUIRED: LineField[] = [
  'contract',
  'clientName',
  'sumInsured',
  'netPremium',
  'commission',
];

function parseNumber(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const text = String(raw ?? '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();
  if (!text) return 0;
  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
}

function cellString(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Excel date serials are handled by xlsx as Date when cellDates is on;
    // plain numbers stay as strings here for IDs.
    return String(raw);
  }
  if (raw instanceof Date) {
    const dd = String(raw.getDate()).padStart(2, '0');
    const mm = String(raw.getMonth() + 1).padStart(2, '0');
    const yyyy = raw.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return String(raw).trim();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i += 1;
      } else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(current);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  row.push(current);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

async function sheetToMatrix(file: File): Promise<unknown[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return parseCsv(text);
  }

  const XLSX = await import('@e965/xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Workbook has no sheets');
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];
}

export async function parseCommissionSheet(
  file: File,
): Promise<ParseCommissionSheetResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let matrix: unknown[][];

  try {
    matrix = await sheetToMatrix(file);
  } catch (err) {
    return {
      lines: [],
      totalCommission: 0,
      errors: [
        err instanceof Error ? err.message : 'Failed to read spreadsheet',
      ],
      warnings,
    };
  }

  if (!matrix.length) {
    return {
      lines: [],
      totalCommission: 0,
      errors: ['Spreadsheet is empty'],
      warnings,
    };
  }

  const headerRow = matrix[0].map((c) => cellString(c));
  const fieldIndex = new Map<LineField, number>();
  headerRow.forEach((header, index) => {
    const key = HEADER_ALIASES[normalizeHeader(header)];
    if (key && !fieldIndex.has(key)) fieldIndex.set(key, index);
  });

  for (const field of REQUIRED) {
    if (!fieldIndex.has(field)) {
      errors.push(`Missing required column: ${field}`);
    }
  }
  if (errors.length) {
    return { lines: [], totalCommission: 0, errors, warnings };
  }

  const lines: Omit<ExternalVetCommissionLine, 'id'>[] = [];
  for (let r = 1; r < matrix.length; r += 1) {
    const row = matrix[r] ?? [];
    const get = (field: LineField) => {
      const idx = fieldIndex.get(field);
      return idx == null ? '' : cellString(row[idx]);
    };

    const contract = get('contract');
    const clientName = get('clientName');
    // Skip blank / TOTAL rows
    if (!contract && !clientName) continue;
    const lowerContract = contract.toLowerCase();
    if (lowerContract.includes('total') || clientName.toLowerCase() === 'total') {
      continue;
    }

    const sumInsured = parseNumber(get('sumInsured'));
    const netPremium = parseNumber(get('netPremium'));
    const commission = parseNumber(get('commission'));
    const snRaw = get('sn');
    const sn = snRaw ? parseNumber(snRaw) : lines.length + 1;

    if (!contract) {
      warnings.push(`Row ${r + 1}: missing Contract — skipped`);
      continue;
    }
    if ([sumInsured, netPremium, commission].some((n) => Number.isNaN(n))) {
      warnings.push(`Row ${r + 1}: invalid numeric values — skipped`);
      continue;
    }

    lines.push({
      sn: Number.isFinite(sn) && sn > 0 ? sn : lines.length + 1,
      prodDate: get('prodDate'),
      branch: get('branch'),
      effecDate: get('effecDate'),
      expiryDate: get('expiryDate'),
      contract,
      typeLivestock: get('typeLivestock') || 'Cattle-Non-Girinka',
      clientId: get('clientId'),
      clientName,
      agent: get('agent') || 'SOLEKTRA R',
      sumInsured,
      netPremium,
      commission,
      userName: get('userName'),
    });
  }

  if (!lines.length) {
    errors.push('No valid commission rows found');
  }

  const totalCommission = lines.reduce((sum, l) => sum + l.commission, 0);
  return { lines, totalCommission, errors, warnings };
}
