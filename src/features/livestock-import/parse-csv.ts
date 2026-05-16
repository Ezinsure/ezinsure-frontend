import { TEKANA_IMPORT_COLUMNS } from '@/features/livestock-import/template';
import type { ParsedImportRow } from '@/features/livestock-import/types';

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

export function parseTekanaCsv(text: string): ParsedImportRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const headerToKey = new Map<string, string>();

  for (const column of TEKANA_IMPORT_COLUMNS) {
    headerToKey.set(column.header.toLowerCase(), column.key);
  }

  const rows: ParsedImportRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((cell) => !cell)) continue;

    const values: Record<string, string> = {};
    headers.forEach((header, index) => {
      const key = headerToKey.get(header);
      if (key) {
        values[key] = cells[index] ?? '';
      }
    });

    rows.push({ rowNumber: i + 1, values });
  }

  return rows;
}
