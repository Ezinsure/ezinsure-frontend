/**
 * Reads the livestock commission claim form (Kinyarwanda or English) and
 * returns only the rows of the section 2 table. Identification, declaration and
 * signature blocks are ignored, and the table is closed by the
 * TOTAL / IGITERANYO footer.
 */

import type { ExternalVetCommissionLine } from './domain';
import {
  CLAIM_FORM_COLUMNS,
  CLAIM_FORM_COLUMN_COUNT,
  NUMERIC_CLAIM_FORM_FIELDS,
  REQUIRED_CLAIM_FORM_FIELDS,
  isRowNumberHeader,
  isSectionHeading,
  isTotalLabel,
  scoreHeaderAgainstColumn,
  type ClaimFormLanguage,
  type SheetLineField,
} from './commission-sheet-schema';

/** How a sheet column was resolved to a canonical field. */
export type ColumnMatchMethod = 'exact' | 'fuzzy' | 'position';

export type ColumnMatch = {
  field: SheetLineField;
  /** English label for the canonical column. */
  label: string;
  /** Header text as written in the uploaded file. */
  sourceHeader: string;
  columnIndex: number;
  method: ColumnMatchMethod;
};

export type ParseCommissionSheetResult = {
  /** Parsed table rows; companyCommission is 0 until the upload form applies %. */
  lines: Omit<ExternalVetCommissionLine, 'id'>[];
  totalNetPremium: number;
  totalSumInsured: number;
  totalVetCommission: number;
  errors: string[];
  warnings: string[];
  /** Which sheet column fed each canonical field, for the upload preview. */
  columnMatches: ColumnMatch[];
  /** Language detected from the header row, when recognisable. */
  detectedLanguage?: ClaimFormLanguage;
  /** Best-effort period label from title rows on legacy SONARWA exports. */
  periodLabel?: string;
};

/** Minimum similarity before a header is trusted to identify a column. */
const MATCH_THRESHOLD = 34;
/** At or above this score the header is treated as the official wording. */
const EXACT_THRESHOLD = 95;
/** Header rows always sit near the top; never scan the whole sheet for one. */
const HEADER_SCAN_LIMIT = 60;

function cellString(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'number') return Number.isFinite(raw) ? String(raw) : '';
  if (raw instanceof Date) {
    const day = String(raw.getDate()).padStart(2, '0');
    const month = String(raw.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${raw.getFullYear()}`;
  }
  return String(raw).trim();
}

/** Parses `"1,250,000"`, `"1 250 000"` or `1250000`. Blank means 0. */
function parseAmount(raw: string): number {
  const text = raw.replace(/[\s,']/g, '').replace(/rwf|frw/gi, '').trim();
  if (!text) return 0;
  const value = Number(text);
  return Number.isFinite(value) ? value : NaN;
}

type HeaderResolution = {
  headerIndex: number;
  columns: Map<SheetLineField, ColumnMatch>;
  detectedLanguage?: ClaimFormLanguage;
};

/**
 * Assigns sheet columns to canonical fields using a global best-first pass, so
 * the strongest header/column pair claims its slot before weaker candidates.
 * This keeps similar Kinyarwanda headers apart — for example
 * "Ishami / Akarere byakoreweho" (branch) versus "Akarere k'Umukiriya"
 * (client district), which share the word "Akarere".
 */
function matchColumnsByText(headerRow: string[]): {
  matches: Map<SheetLineField, ColumnMatch>;
  detectedLanguage?: ClaimFormLanguage;
} {
  type Candidate = {
    field: SheetLineField;
    label: string;
    columnIndex: number;
    score: number;
    language?: ClaimFormLanguage;
  };

  const candidates: Candidate[] = [];

  headerRow.forEach((header, columnIndex) => {
    if (!header.trim() || isRowNumberHeader(header)) return;
    for (const column of CLAIM_FORM_COLUMNS) {
      const { score, language } = scoreHeaderAgainstColumn(header, column);
      if (score >= MATCH_THRESHOLD) {
        candidates.push({
          field: column.field,
          label: column.label,
          columnIndex,
          score,
          language,
        });
      }
    }
  });

  candidates.sort((a, b) => b.score - a.score || a.columnIndex - b.columnIndex);

  const matches = new Map<SheetLineField, ColumnMatch>();
  const usedColumns = new Set<number>();
  const languageVotes: Record<ClaimFormLanguage, number> = { en: 0, rw: 0 };

  for (const candidate of candidates) {
    if (matches.has(candidate.field) || usedColumns.has(candidate.columnIndex)) {
      continue;
    }
    matches.set(candidate.field, {
      field: candidate.field,
      label: candidate.label,
      sourceHeader: headerRow[candidate.columnIndex] ?? '',
      columnIndex: candidate.columnIndex,
      method: candidate.score >= EXACT_THRESHOLD ? 'exact' : 'fuzzy',
    });
    usedColumns.add(candidate.columnIndex);
    if (candidate.language) languageVotes[candidate.language] += 1;
  }

  const detectedLanguage =
    languageVotes.en === 0 && languageVotes.rw === 0
      ? undefined
      : languageVotes.rw >= languageVotes.en
        ? 'rw'
        : 'en';

  return { matches, detectedLanguage };
}

/**
 * Minimum headers that must already match by text before column positions are
 * trusted. This keeps the fallback from mis-mapping a sheet that merely
 * resembles the claim form, such as a legacy SONARWA export.
 */
const POSITION_FALLBACK_MIN_TEXT_MATCHES = 8;

/**
 * Recovers columns whose header was renamed or left blank by falling back to
 * the official template position, provided that slot is still free.
 */
function fillGapsByPosition(
  headerRow: string[],
  matches: Map<SheetLineField, ColumnMatch>,
  warnings: string[],
): void {
  // Only trust positions on a sheet that is clearly the official table.
  if (headerRow.length < CLAIM_FORM_COLUMN_COUNT) return;
  if (matches.size < POSITION_FALLBACK_MIN_TEXT_MATCHES) return;

  const usedColumns = new Set([...matches.values()].map((m) => m.columnIndex));

  for (const column of CLAIM_FORM_COLUMNS) {
    if (matches.has(column.field)) continue;
    if (usedColumns.has(column.templateIndex)) continue;

    const sourceHeader = headerRow[column.templateIndex] ?? '';
    matches.set(column.field, {
      field: column.field,
      label: column.label,
      sourceHeader,
      columnIndex: column.templateIndex,
      method: 'position',
    });
    usedColumns.add(column.templateIndex);
    warnings.push(
      `Header "${sourceHeader || '(blank)'}" was not recognised — read as "${column.label}" from its position in the template.`,
    );
  }
}

/** A row qualifies as the header when it resolves enough required columns. */
function scoreHeaderRow(row: string[]): number {
  const { matches } = matchColumnsByText(row);
  return REQUIRED_CLAIM_FORM_FIELDS.filter((field) => matches.has(field)).length;
}

/**
 * Locates the header row. The section 2 heading is the primary anchor; when it
 * is missing (hand-made or legacy sheets) we fall back to the best-scoring row.
 */
function resolveHeaderRow(
  matrix: string[][],
  warnings: string[],
): HeaderResolution | null {
  const scanLimit = Math.min(matrix.length, HEADER_SCAN_LIMIT);

  const sectionIndex = matrix.findIndex((row) =>
    row.some((cell) => isSectionHeading(cell)),
  );

  if (sectionIndex >= 0) {
    // The header is the first populated row beneath the section heading.
    for (let i = sectionIndex + 1; i < Math.min(matrix.length, sectionIndex + 6); i += 1) {
      const row = matrix[i] ?? [];
      if (!row.some((cell) => cell.trim())) continue;
      if (scoreHeaderRow(row) >= 2) return buildResolution(row, i, warnings);
      break;
    }
    warnings.push(
      'Found the contracts section but its column headers were unclear — matched the table by scanning instead.',
    );
  }

  let bestIndex = -1;
  let bestScore = 0;
  for (let i = 0; i < scanLimit; i += 1) {
    const score = scoreHeaderRow(matrix[i] ?? []);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
    if (score === REQUIRED_CLAIM_FORM_FIELDS.length) break;
  }

  if (bestIndex < 0 || bestScore < 2) return null;
  return buildResolution(matrix[bestIndex] ?? [], bestIndex, warnings);
}

function buildResolution(
  headerRow: string[],
  headerIndex: number,
  warnings: string[],
): HeaderResolution {
  const { matches, detectedLanguage } = matchColumnsByText(headerRow);
  fillGapsByPosition(headerRow, matches, warnings);
  return { headerIndex, columns: matches, detectedLanguage };
}

/** Period title used by legacy SONARWA exports, e.g. "UP MAY 2026". */
function guessPeriodLabel(matrix: string[][], headerIndex: number): string | undefined {
  for (let i = 0; i < headerIndex; i += 1) {
    const text = (matrix[i] ?? []).filter(Boolean).join(' ').trim();
    if (!text) continue;
    const match = text.match(/\bUP\s+[A-Z]+\s+\d{4}\b/i);
    if (match) return match[0].toUpperCase();
  }
  return undefined;
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
      rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }
  row.push(current);
  rows.push(row);
  return rows;
}

async function readSheetMatrix(file: File): Promise<string[][]> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    return parseCsv(await file.text()).map((row) => row.map(cellString));
  }

  const XLSX = await import('@e965/xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    cellDates: true,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Workbook has no sheets');

  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false,
    blankrows: true,
  }) as unknown[][];

  return matrix.map((row) => (row ?? []).map(cellString));
}

function emptyResult(
  errors: string[],
  warnings: string[] = [],
): ParseCommissionSheetResult {
  return {
    lines: [],
    totalNetPremium: 0,
    totalSumInsured: 0,
    totalVetCommission: 0,
    errors,
    warnings,
    columnMatches: [],
  };
}

export async function parseCommissionSheet(
  file: File,
): Promise<ParseCommissionSheetResult> {
  const warnings: string[] = [];

  let matrix: string[][];
  try {
    matrix = await readSheetMatrix(file);
  } catch (err) {
    return emptyResult([
      err instanceof Error ? err.message : 'Failed to read the spreadsheet',
    ]);
  }

  if (!matrix.length) return emptyResult(['The spreadsheet is empty']);

  const resolution = resolveHeaderRow(matrix, warnings);
  if (!resolution) {
    return emptyResult(
      [
        'Could not find the contracts table. Use the official claim form and keep the "2. URUTONDE RW\'AMATUNGO YASHYIZWE MU BWISHINGIZI" / "2. LIST OF CONTRACTS" heading with its column titles.',
      ],
      warnings,
    );
  }

  const { headerIndex, columns, detectedLanguage } = resolution;

  const missingRequired = REQUIRED_CLAIM_FORM_FIELDS.filter(
    (field) => !columns.has(field),
  );
  if (missingRequired.length) {
    const labels = missingRequired
      .map(
        (field) =>
          CLAIM_FORM_COLUMNS.find((c) => c.field === field)?.label ?? field,
      )
      .join(', ');
    return emptyResult([`Missing required column(s): ${labels}`], warnings);
  }

  for (const column of CLAIM_FORM_COLUMNS) {
    if (!columns.has(column.field)) {
      warnings.push(`Column "${column.label}" was not found — left blank.`);
    }
  }

  const lines: Omit<ExternalVetCommissionLine, 'id'>[] = [];

  for (let r = headerIndex + 1; r < matrix.length; r += 1) {
    const row = matrix[r] ?? [];

    // TOTAL / IGITERANYO closes the table; nothing below it belongs to it.
    if (row.some((cell) => isTotalLabel(cell))) break;

    const read = (field: SheetLineField): string => {
      const match = columns.get(field);
      return match ? (row[match.columnIndex] ?? '').trim() : '';
    };

    // Blank template rows are expected — skip them without complaining.
    const hasAnyValue = CLAIM_FORM_COLUMNS.some((c) => read(c.field) !== '');
    if (!hasAnyValue) continue;

    const contract = read('contract');
    const clientName = read('clientName');
    if (!contract && !clientName) {
      warnings.push(
        `Row ${r + 1}: no contract number or client name — skipped.`,
      );
      continue;
    }

    const amounts: Partial<Record<SheetLineField, number>> = {};
    let hasInvalidAmount = false;
    for (const field of NUMERIC_CLAIM_FORM_FIELDS) {
      const value = parseAmount(read(field));
      if (Number.isNaN(value)) {
        hasInvalidAmount = true;
        break;
      }
      amounts[field] = value;
    }
    if (hasInvalidAmount) {
      warnings.push(
        `Row ${r + 1}: an amount could not be read as a number — skipped.`,
      );
      continue;
    }

    lines.push({
      // Display-only counter; the sheet's own "N°" column is ignored.
      sn: lines.length + 1,
      microchipNumber: read('microchipNumber'),
      prodDate: read('prodDate'),
      branch: read('branch'),
      effecDate: read('effecDate'),
      expiryDate: read('expiryDate'),
      contract,
      typeLivestock: read('typeLivestock'),
      clientId: read('clientId'),
      clientName,
      clientDistrict: read('clientDistrict'),
      clientSector: read('clientSector'),
      sumInsured: amounts.sumInsured ?? 0,
      netPremium: amounts.netPremium ?? 0,
      vetCommission: amounts.vetCommission ?? 0,
      companyCommission: 0,
    });
  }

  const errors = lines.length
    ? []
    : ['No filled contract rows were found in the table'];

  return {
    lines,
    totalNetPremium: lines.reduce((sum, l) => sum + l.netPremium, 0),
    totalSumInsured: lines.reduce((sum, l) => sum + l.sumInsured, 0),
    totalVetCommission: lines.reduce((sum, l) => sum + l.vetCommission, 0),
    errors,
    warnings,
    columnMatches: CLAIM_FORM_COLUMNS.map((c) => columns.get(c.field)).filter(
      (m): m is ColumnMatch => m != null,
    ),
    detectedLanguage,
    periodLabel: guessPeriodLabel(matrix, headerIndex),
  };
}
