import { LIVESTOCK_BULK_IMPORT_HEADERS } from '@/features/livestock-application/constants';
import { createEmptyLivestockItem, createLivestockItemId } from '@/features/livestock-application/initial-state';
import type { LivestockAnimalRow } from '@/features/livestock-application/types';

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
      } else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '');
}

const HEADER_ALIASES: Record<string, keyof LivestockAnimalRow> = {
  animaltype: 'animalType',
  ubwokobwitungo: 'animalType',
  animalcategory: 'animalCategory',
  icyiciro: 'animalCategory',
  animalage: 'animalAge',
  imyaka: 'animalAge',
  chipnumber: 'chipNumber',
  chip: 'chipNumber',
  eartag: 'chipNumber',
  eartagno: 'chipNumber',
  lotno: 'chipNumber',
  identificationnumber: 'chipNumber',
  breed: 'breed',
  ubwoko: 'breed',
  color: 'color',
  ibara: 'color',
  productivity: 'productivity',
  umusaruro: 'productivity',
  sumassured: 'sumAssured',
  estimatedvalue: 'sumAssured',
  agaciro: 'sumAssured',
  vaccinationinfo: 'vaccinationInfo',
  amakuruyogukingira: 'vaccinationInfo',
  ownernationalid: 'ownerNationalId',
  indangamuntu: 'ownerNationalId',
  ownergender: 'ownerGender',
  igitsina: 'ownerGender',
};

export interface BulkImportResult {
  items: LivestockAnimalRow[];
  errors: string[];
  skippedRows: number;
}

function resolveHeaderKey(norm: string): keyof LivestockAnimalRow | null {
  if (HEADER_ALIASES[norm]) return HEADER_ALIASES[norm];
  const camel = LIVESTOCK_BULK_IMPORT_HEADERS.find(
    (h) => normalizeHeader(h) === norm,
  ) as keyof LivestockAnimalRow | undefined;
  return camel && camel !== 'id' ? camel : null;
}

export function parseLivestockBulkCsv(text: string): BulkImportResult {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { items: [], errors: ['Dosiye ifite header n’imirongo ibura.'], skippedRows: 0 };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const headerMap = new Map<number, keyof LivestockAnimalRow>();
  rawHeaders.forEach((h, idx) => {
    const key = resolveHeaderKey(normalizeHeader(h));
    if (key) headerMap.set(idx, key);
  });

  if (![...headerMap.values()].includes('chipNumber')) {
    return {
      items: [],
      errors: [
        'Header irakenewe: chipNumber (cyangwa Eartag / Chip). Reba template: animalType, chipNumber, …',
      ],
      skippedRows: 0,
    };
  }

  const items: LivestockAnimalRow[] = [];
  const errors: string[] = [];
  let skippedRows = 0;

  for (let r = 1; r < lines.length; r += 1) {
    const cells = parseCsvLine(lines[r]);
    if (cells.every((c) => !c)) {
      skippedRows += 1;
      continue;
    }
    const item = createEmptyLivestockItem();
    item.id = createLivestockItemId();
    headerMap.forEach((field, colIdx) => {
      if (field === 'id') return;
      const raw = cells[colIdx] ?? '';
      if (field === 'poultryProductType') {
        item.poultryProductType = raw as LivestockAnimalRow['poultryProductType'];
        return;
      }
      if (field === 'ownerGender') {
        const normalized = raw.trim().toLowerCase();
        if (normalized === 'male' || normalized === 'gabo') item.ownerGender = 'male';
        else if (normalized === 'female' || normalized === 'gore') item.ownerGender = 'female';
        return;
      }
      (item as Record<string, string>)[field] = raw;
    });
    if (!item.chipNumber.trim()) {
      errors.push(`Umurongo ${r + 1}: Eartag irabura.`);
      skippedRows += 1;
      continue;
    }
    items.push(item);
  }

  return { items, errors, skippedRows };
}

async function readFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buffer);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(buffer);
  }
  return new TextDecoder('utf-8').decode(buffer);
}

function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return false;
  if (name.endsWith('.csv')) return true;
  const type = file.type.toLowerCase();
  return type === 'text/csv' || type === 'application/csv' || type === 'text/comma-separated-values';
}

function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return true;
  const type = file.type.toLowerCase();
  return (
    type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    type === 'application/vnd.ms-excel'
  );
}

async function parseLivestockBulkExcel(file: File): Promise<BulkImportResult> {
  try {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { items: [], errors: ['Excel idahariho urupapuro.'], skippedRows: 0 };
    }
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
    return parseLivestockBulkCsv(csv);
  } catch {
    return { items: [], errors: ['Ntibyashobotse gusoma dosiye ya Excel.'], skippedRows: 0 };
  }
}

export async function parseLivestockBulkFile(file: File): Promise<BulkImportResult> {
  if (isCsvFile(file)) {
    const text = await readFileText(file);
    return parseLivestockBulkCsv(text);
  }

  if (isExcelFile(file)) {
    const excelResult = await parseLivestockBulkExcel(file);
    if (excelResult.items.length > 0) return excelResult;
    return excelResult;
  }

  // Unknown extension: try CSV text first, then Excel
  const text = await readFileText(file);
  const csvResult = parseLivestockBulkCsv(text);
  if (csvResult.items.length > 0) return csvResult;

  if (csvResult.errors.length > 0 && !csvResult.errors[0].includes('Header')) {
    return csvResult;
  }

  const excelResult = await parseLivestockBulkExcel(file);
  if (excelResult.items.length > 0) return excelResult;

  return {
    items: [],
    errors: [
      csvResult.errors[0] ??
        excelResult.errors[0] ??
        'Hitamo CSV (.csv) cyangwa Excel (.xlsx, .xls) ukurikije template.',
    ],
    skippedRows: 0,
  };
}

export function downloadLivestockBulkTemplate(): void {
  const headers = [
    'animalType',
    'animalCategory',
    'animalAge',
    'chipNumber',
    'breed',
    'color',
    'productivity',
    'sumAssured',
  ];
  const sample = ['Inka', 'Imbyeyi', '3', '956000000000001', 'Fresian', 'Black', 'Milk', '700000'];
  const csv = [headers.join(','), sample.join(',')].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ezinsure_livestock_animals_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}
