import {
  EZINSURE_ADDED_COLUMNS,
  TEKANA_IMPORT_COLUMNS,
} from '@/features/livestock-import/template';
import type { ParseTekanaCsvResult, ParsedImportRow } from '@/features/livestock-import/types';

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

export function normalizeCsvHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildHeaderToKeyMap(): Map<string, string> {
  const map = new Map<string, string>();

  for (const column of TEKANA_IMPORT_COLUMNS) {
    map.set(normalizeCsvHeader(column.header), column.key);
    column.aliases?.forEach((alias) => {
      map.set(normalizeCsvHeader(alias), column.key);
    });
  }

  return map;
}

const HEADER_TO_KEY = buildHeaderToKeyMap();

export function parseTekanaCsv(text: string): ParseTekanaCsvResult {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      rows: [],
      missingEzinsureHeaders: EZINSURE_ADDED_COLUMNS.filter((c) => c.required).map((c) => c.header),
    };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const normalizedHeaders = rawHeaders.map(normalizeCsvHeader);

  const missingEzinsureHeaders = EZINSURE_ADDED_COLUMNS.filter((col) => col.required).filter(
    (col) => {
      const norm = normalizeCsvHeader(col.header);
      const aliasNorms = (col.aliases ?? []).map(normalizeCsvHeader);
      return !normalizedHeaders.some(
        (h) => h === norm || aliasNorms.includes(h),
      );
    },
  ).map((c) => c.header);

  const rows: ParsedImportRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((cell) => !cell)) continue;

    const values: Record<string, string> = {};
    const raw: Record<string, string> = {};

    rawHeaders.forEach((header, index) => {
      const cell = (cells[index] ?? '').trim();
      raw[header] = cell;

      const key = HEADER_TO_KEY.get(normalizeCsvHeader(header));
      if (key) {
        values[key] = cell;
      }
    });

    rows.push({ rowNumber: i + 1, values, raw });
  }

  return { rows, missingEzinsureHeaders };
}
