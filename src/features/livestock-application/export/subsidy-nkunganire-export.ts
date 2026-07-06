import type {
  LivestockApplicationPackage,
  LivestockSpeciesGroup,
} from '@/features/livestock-application/domain/application-types';
import { resolveSubsidyEligibility } from '@/features/livestock-application/utils/subsidy-eligibility';

const NKUNGANIRE_TEMPLATE_URL = '/templates/livestock-nkunganire-template.xlsx';

interface SheetLayout {
  sheetName: string;
  header: {
    district: { row: number; col: number; format: (value: string) => string };
    sector: { row: number; col: number; format: (value: string) => string };
    species: { row: number; col: number; format: (label: string) => string };
    maleCount: { row: number; col: number };
    femaleCount: { row: number; col: number };
  };
  headerRow: number;
  dataStartRow: number;
  dataColOffset: number;
  totalRow: number;
  totalPremiumCol: number;
  totalFarmerCol: number;
  totalGovtCol: number;
  maxDataRows: number;
  speciesLabel: string;
}

/** Cell coordinates match the official MINAGRI template (0-indexed row/col). */
const SHEET_LAYOUT: Record<LivestockSpeciesGroup, SheetLayout> = {
  POULTRY: {
    sheetName: 'Inkoko',
    header: {
      district: { row: 8, col: 2, format: (v) => `AKARERE KA: ${v}`.trim() },
      sector: { row: 10, col: 2, format: (v) => `UMURENGE WA ${v}`.trim() },
      species: { row: 12, col: 2, format: (label) => `UBWOKO BW'AMATUNGO: ${label}` },
      maleCount: { row: 11, col: 8 },
      femaleCount: { row: 11, col: 10 },
    },
    headerRow: 15,
    dataStartRow: 16,
    dataColOffset: 1,
    totalRow: 17,
    totalPremiumCol: 9,
    totalFarmerCol: 10,
    totalGovtCol: 11,
    maxDataRows: 1,
    speciesLabel: 'INKOKO',
  },
  PIG: {
    sheetName: 'Ingurube',
    header: {
      district: { row: 7, col: 1, format: (v) => `AKARERE : ${v}`.trim() },
      sector: { row: 9, col: 1, format: (v) => `UMURENGE: ${v}`.trim() },
      species: { row: 11, col: 1, format: (label) => `UBWOKO BW'AMATUNGO: ${label}` },
      maleCount: { row: 10, col: 7 },
      femaleCount: { row: 10, col: 9 },
    },
    headerRow: 14,
    dataStartRow: 15,
    dataColOffset: 0,
    totalRow: 30,
    totalPremiumCol: 8,
    totalFarmerCol: 9,
    totalGovtCol: 10,
    maxDataRows: 15,
    speciesLabel: 'INGURUBE',
  },
  CATTLE: {
    sheetName: 'Ingurube',
    header: {
      district: { row: 7, col: 1, format: (v) => `AKARERE : ${v}`.trim() },
      sector: { row: 9, col: 1, format: (v) => `UMURENGE: ${v}`.trim() },
      species: { row: 11, col: 1, format: (label) => `UBWOKO BW'AMATUNGO: ${label}` },
      maleCount: { row: 10, col: 7 },
      femaleCount: { row: 10, col: 9 },
    },
    headerRow: 14,
    dataStartRow: 15,
    dataColOffset: 0,
    totalRow: 30,
    totalPremiumCol: 8,
    totalFarmerCol: 9,
    totalGovtCol: 10,
    maxDataRows: 15,
    speciesLabel: 'INKA',
  },
};

interface ExportRow {
  ownerName: string;
  gender: string;
  nationalId: string;
  phone: string;
  lotOrChip: string;
  policyNumber: string;
  sumAssured: number;
  premiumRate: number;
  farmerContribution: number;
  governmentContribution: number;
}

function genderLabel(gender?: 'male' | 'female'): string {
  if (gender === 'male') return 'Gabo';
  if (gender === 'female') return 'Gore';
  return '';
}

function policyYearLabel(application: LivestockApplicationPackage): string {
  const start = application.policyStartDate?.slice(0, 4);
  const end = application.policyEndDate?.slice(0, 4);
  if (start && end) return `${start}/${end}`;
  if (start) return start;
  return new Date().getFullYear().toString();
}

function countGenders(application: LivestockApplicationPackage): { male: number; female: number } {
  const owners =
    application.ownersList?.length
      ? application.ownersList
      : application.primaryOwner
        ? [application.primaryOwner]
        : [];

  let male = 0;
  let female = 0;
  for (const owner of owners) {
    if (owner.gender === 'male') male += 1;
    else if (owner.gender === 'female') female += 1;
  }

  if (male === 0 && female === 0) {
    if (application.ownerGender === 'male') male = 1;
    else if (application.ownerGender === 'female') female = 1;
    else female = Math.max(1, application.lineCount || 1);
  }

  return { male, female };
}

function buildExportRows(application: LivestockApplicationPackage): ExportRow[] {
  const eligibility = resolveSubsidyEligibility(application);
  const sourceLines =
    eligibility.required && eligibility.linesMissingTekana.length > 0
      ? eligibility.linesMissingTekana
      : application.lines;

  return sourceLines.map((line) => ({
    ownerName: line.owner?.name ?? application.primaryOwner?.name ?? application.ownerSummary,
    gender: genderLabel(line.owner?.gender ?? application.primaryOwner?.gender ?? application.ownerGender),
    nationalId:
      line.owner?.nationalId ??
      application.primaryOwner?.nationalId ??
      application.nationalId ??
      '',
    phone: line.owner?.phone ?? application.primaryOwner?.phone ?? '',
    lotOrChip:
      application.speciesGroup === 'CATTLE'
        ? line.animal.chipNumber ?? ''
        : line.lineType === 'LOT'
          ? `Lot ×${line.quantity}`
          : line.animal.species,
    policyNumber: application.applicationNumber,
    sumAssured: line.sumAssured,
    premiumRate: line.premiumRate,
    farmerContribution: line.farmerContribution,
    governmentContribution: line.governmentContribution,
  }));
}

function setCell(
  sheet: Record<string, unknown>,
  row: number,
  col: number,
  value: string | number | null,
  encodeCell: (cell: { r: number; c: number }) => string,
): void {
  if (value === null) {
    const addr = encodeCell({ r: row, c: col });
    delete sheet[addr];
    return;
  }

  const addr = encodeCell({ r: row, c: col });
  const existing = sheet[addr] as { t?: string; v?: unknown } | undefined;
  if (existing) {
    existing.v = value;
    existing.t = typeof value === 'number' ? 'n' : 's';
    return;
  }
  sheet[addr] = { t: typeof value === 'number' ? 'n' : 's', v: value };
}

function clearDataRows(
  sheet: Record<string, unknown>,
  layout: SheetLayout,
  encodeCell: (cell: { r: number; c: number }) => string,
): void {
  const base = layout.dataColOffset;
  for (let i = 0; i < layout.maxDataRows; i += 1) {
    const r = layout.dataStartRow + i;
    for (let c = base; c <= base + 11; c += 1) {
      setCell(sheet, r, c, null, encodeCell);
    }
  }
}

function updatePolicyYearTitle(
  sheet: Record<string, unknown>,
  yearLabel: string,
  decodeRange: (ref: string) => { s: { r: number; c: number }; e: { r: number; c: number } },
  encodeCell: (cell: { r: number; c: number }) => string,
): void {
  const range = decodeRange((sheet['!ref'] as string) ?? 'A1:L40');
  for (let r = 0; r <= range.e.r; r += 1) {
    for (let c = 0; c <= range.e.c; c += 1) {
      const addr = encodeCell({ r, c });
      const cell = sheet[addr] as { v?: unknown } | undefined;
      if (typeof cell?.v === 'string' && cell.v.includes('UMWAKA WA')) {
        cell.v = cell.v.replace(/UMWAKA WA\s+[\d/]+/i, `UMWAKA WA ${yearLabel}`);
      }
    }
  }
}

/** Download official MINAGRI nkunganire Excel with application data prefilled. */
export async function downloadNkunganireSubsidyExcel(
  application: LivestockApplicationPackage,
): Promise<void> {
  const layout = SHEET_LAYOUT[application.speciesGroup];
  const response = await fetch(NKUNGANIRE_TEMPLATE_URL);
  if (!response.ok) {
    throw new Error('Could not load the nkunganire Excel template.');
  }

  const buffer = await response.arrayBuffer();
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array', cellStyles: true });
  const sheet = workbook.Sheets[layout.sheetName];
  if (!sheet) {
    throw new Error(`Template sheet "${layout.sheetName}" was not found.`);
  }

  const { encode_cell: encodeCell, decode_range: decodeRange } = XLSX.utils;

  const location = application.livestockLocation;
  const genders = countGenders(application);
  const rows = buildExportRows(application).slice(0, layout.maxDataRows);
  const base = layout.dataColOffset;

  setCell(
    sheet,
    layout.header.district.row,
    layout.header.district.col,
    layout.header.district.format(location?.district ?? ''),
    encodeCell,
  );
  setCell(
    sheet,
    layout.header.sector.row,
    layout.header.sector.col,
    layout.header.sector.format(location?.sector ?? ''),
    encodeCell,
  );
  setCell(
    sheet,
    layout.header.species.row,
    layout.header.species.col,
    layout.header.species.format(layout.speciesLabel),
    encodeCell,
  );
  setCell(sheet, layout.header.maleCount.row, layout.header.maleCount.col, `Abagabo: ${genders.male}`, encodeCell);
  setCell(
    sheet,
    layout.header.femaleCount.row,
    layout.header.femaleCount.col,
    `Abagore : ${genders.female}`,
    encodeCell,
  );
  updatePolicyYearTitle(sheet, policyYearLabel(application), decodeRange, encodeCell);

  clearDataRows(sheet, layout, encodeCell);

  rows.forEach((row, index) => {
    const r = layout.dataStartRow + index;
    setCell(sheet, r, base + 0, index + 1, encodeCell);
    setCell(sheet, r, base + 1, row.ownerName, encodeCell);
    setCell(sheet, r, base + 2, row.gender, encodeCell);
    setCell(sheet, r, base + 3, row.nationalId, encodeCell);
    setCell(sheet, r, base + 4, row.phone, encodeCell);
    setCell(sheet, r, base + 5, row.lotOrChip, encodeCell);
    setCell(sheet, r, base + 6, row.policyNumber, encodeCell);
    setCell(sheet, r, base + 7, row.sumAssured, encodeCell);
    setCell(sheet, r, base + 8, row.premiumRate, encodeCell);
    setCell(sheet, r, base + 9, row.farmerContribution, encodeCell);
    setCell(sheet, r, base + 10, row.governmentContribution, encodeCell);
  });

  const totals = rows.reduce(
    (acc, row) => ({
      premiumRate: acc.premiumRate + row.premiumRate,
      farmerContribution: acc.farmerContribution + row.farmerContribution,
      governmentContribution: acc.governmentContribution + row.governmentContribution,
    }),
    { premiumRate: 0, farmerContribution: 0, governmentContribution: 0 },
  );

  setCell(sheet, layout.totalRow, base, 'TOTAL', encodeCell);
  setCell(sheet, layout.totalRow, layout.totalPremiumCol, totals.premiumRate, encodeCell);
  setCell(sheet, layout.totalRow, layout.totalFarmerCol, totals.farmerContribution, encodeCell);
  setCell(sheet, layout.totalRow, layout.totalGovtCol, totals.governmentContribution, encodeCell);

  if (application.speciesGroup === 'POULTRY') {
    workbook.SheetNames = ['Inkoko'];
  } else {
    workbook.SheetNames = workbook.SheetNames.filter((name) => name === layout.sheetName);
  }

  const filename = `${application.applicationNumber}-nkunganire.xlsx`;
  XLSX.writeFile(workbook, filename);
}
