import type { TekanaImportColumn } from '@/features/livestock-import/types';

export const TEKANA_IMPORT_COLUMNS: TekanaImportColumn[] = [
  {
    key: 'tekanaTagId',
    header: 'tekana_tag_id',
    label: 'Tekana tag ID',
    required: true,
    description: 'Official Tekana ear-tag identifier from the national registry.',
    example: 'RW-TK-2024-00891',
  },
  {
    key: 'ownerFullName',
    header: 'owner_full_name',
    label: 'Owner full name',
    required: true,
    description: 'Policy holder / farmer legal name.',
    example: 'Jean Baptiste Uwimana',
  },
  {
    key: 'ownerNationalId',
    header: 'owner_national_id',
    label: 'Owner national ID',
    required: true,
    description: '16-digit Rwanda national ID number.',
    example: '1199887766554433',
  },
  {
    key: 'ownerPhone',
    header: 'owner_phone',
    label: 'Owner phone',
    required: true,
    description: 'Mobile number in Rwanda format (e.g. +250788123456).',
    example: '+250788123456',
  },
  {
    key: 'province',
    header: 'province',
    label: 'Province',
    required: true,
    description: 'Administrative province.',
    example: 'Southern',
  },
  {
    key: 'district',
    header: 'district',
    label: 'District',
    required: true,
    description: 'Administrative district.',
    example: 'Huye',
  },
  {
    key: 'sector',
    header: 'sector',
    label: 'Sector',
    required: true,
    description: 'Administrative sector.',
    example: 'Ngoma',
  },
  {
    key: 'species',
    header: 'species',
    label: 'Species',
    required: true,
    description: 'Animal species (Cattle, Goat, Sheep, Pig, Poultry).',
    example: 'Cattle',
  },
  {
    key: 'breed',
    header: 'breed',
    label: 'Breed',
    required: true,
    description: 'Registered or local breed name.',
    example: 'Ankole',
  },
  {
    key: 'sex',
    header: 'sex',
    label: 'Sex',
    required: true,
    description: 'Male or Female.',
    example: 'Female',
  },
  {
    key: 'ageMonths',
    header: 'age_months',
    label: 'Age (months)',
    required: true,
    description: 'Animal age in whole months.',
    example: '36',
  },
  {
    key: 'insuredValueRwf',
    header: 'insured_value_rwf',
    label: 'Insured value (RWF)',
    required: true,
    description: 'Full insured value used for premium and commission calculations.',
    example: '850000',
  },
  {
    key: 'coverageStartDate',
    header: 'coverage_start_date',
    label: 'Coverage start date',
    required: true,
    description: 'Policy start date (YYYY-MM-DD).',
    example: '2026-06-01',
  },
  {
    key: 'coverageDurationMonths',
    header: 'coverage_duration_months',
    label: 'Coverage duration (months)',
    required: true,
    description: 'Policy length in months (e.g. 6 or 12).',
    example: '12',
  },
  {
    key: 'transactionReference',
    header: 'transaction_reference',
    label: 'Transaction reference',
    required: false,
    description: 'Unique payment reference; duplicates are flagged for fraud review.',
    example: 'MOMO-20260516-0042',
  },
];

const TEMPLATE_FILENAME = 'ezinsure_tekana_livestock_import_template.csv';

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildTemplateCsv(): string {
  const headers = TEKANA_IMPORT_COLUMNS.map((c) => c.header);
  const exampleRow = TEKANA_IMPORT_COLUMNS.map((c) => c.example);
  return [headers, exampleRow].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function downloadTekanaImportTemplate(): void {
  const csv = buildTemplateCsv();
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = TEMPLATE_FILENAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const ACCEPTED_IMPORT_EXTENSIONS = ['.csv', '.xlsx', '.xls'] as const;

export function isAcceptedImportFile(file: File): boolean {
  return ACCEPTED_IMPORT_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
}
