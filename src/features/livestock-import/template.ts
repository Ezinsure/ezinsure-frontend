import type { TekanaImportColumn } from '@/features/livestock-import/types';

/** Columns exactly as Tekana exports in Policy Insurance Report */
export const TEKANA_EXPORT_COLUMNS: TekanaImportColumn[] = [
  {
    key: 'chip',
    header: 'Chip',
    aliases: ['chip', 'tekana chip', 'ear tag'],
    label: 'Chip',
    required: true,
    source: 'tekana',
    description: 'Tekana ear-tag / RFID chip ID. Primary key to trace back to Tekana.',
    example: '956000007478647',
  },
  {
    key: 'policyNumber',
    header: 'Policy Number',
    aliases: ['policy number', 'policy no'],
    label: 'Policy number',
    required: true,
    source: 'tekana',
    description: 'Insurer policy number from Tekana.',
    example: 'RY001MICD287463',
  },
  {
    key: 'insuranceType',
    header: 'Insurance Type',
    label: 'Insurance type',
    required: false,
    source: 'tekana',
    description: 'e.g. Renewal, New.',
    example: 'Renewal',
  },
  {
    key: 'sumAssured',
    header: 'Sum Assured',
    label: 'Sum assured (RWF)',
    required: true,
    source: 'tekana',
    description: 'Full insured value (commission is calculated on this amount).',
    example: '700000',
  },
  {
    key: 'farmerContribution',
    header: 'Farmer Contribution Amount',
    label: 'Farmer contribution',
    required: false,
    source: 'tekana',
    description: 'Farmer premium share in RWF.',
    example: '23100',
  },
  {
    key: 'premiumRate',
    header: 'Premium Rate Amount',
    label: 'Premium rate',
    required: false,
    source: 'tekana',
    description: 'Total premium in RWF.',
    example: '38500',
  },
  {
    key: 'governmentContribution',
    header: 'Government Contribution',
    label: 'Government contribution',
    required: false,
    source: 'tekana',
    description: 'Subsidy portion in RWF.',
    example: '15400',
  },
  {
    key: 'modeOfPayment',
    header: 'Mode Of Payment',
    label: 'Mode of payment',
    required: false,
    source: 'tekana',
    description: 'e.g. Bank, Mobile Money.',
    example: 'Bank',
  },
  {
    key: 'animalType',
    header: 'Type',
    label: 'Animal type',
    required: false,
    source: 'tekana',
    description: 'Tekana classification e.g. Cross, Exotic.',
    example: 'Cross',
  },
  {
    key: 'species',
    header: 'Species',
    label: 'Species',
    required: false,
    source: 'tekana',
    description: 'e.g. Cow.',
    example: 'Cow',
  },
  {
    key: 'breed',
    header: 'Breed',
    label: 'Breed',
    required: false,
    source: 'tekana',
    description: 'Animal breed.',
    example: 'Fresian',
  },
  {
    key: 'sex',
    header: 'Sex',
    label: 'Sex',
    required: false,
    source: 'tekana',
    description: 'Male or Female.',
    example: 'Female',
  },
  {
    key: 'animalDateOfBirth',
    header: 'Date of Birth',
    aliases: ['date of birth', 'animal date of birth'],
    label: 'Animal date of birth',
    required: false,
    source: 'tekana',
    description: 'Animal DOB as exported from Tekana.',
    example: '10/2/2018',
  },
  {
    key: 'chippedDate',
    header: 'Chipped Date',
    label: 'Chipped date',
    required: false,
    source: 'tekana',
    description: 'Date the animal was chipped.',
    example: '5/20/2019',
  },
  {
    key: 'policyInsuranceDate',
    header: 'Policy Insurance Date',
    label: 'Policy start',
    required: false,
    source: 'tekana',
    description: 'Coverage start date.',
    example: '6/20/2025',
  },
  {
    key: 'policyEndDate',
    header: 'Policy End Date',
    label: 'Policy end',
    required: false,
    source: 'tekana',
    description: 'Coverage end date.',
    example: '6/20/2026',
  },
  {
    key: 'ownerName',
    header: 'Owner Name',
    label: 'Owner name',
    required: true,
    source: 'tekana',
    description: 'Farmer / policy holder name.',
    example: 'BITWAYIKI Pierre Celestin',
  },
  {
    key: 'ownerGender',
    header: 'Owner Gender',
    label: 'Owner gender',
    required: false,
    source: 'tekana',
    description: 'Often empty in Tekana exports.',
    example: '',
  },
  {
    key: 'ownerDateOfBirth',
    header: 'Owner Date Of Birth',
    label: 'Owner DOB',
    required: false,
    source: 'tekana',
    description: 'May be 0000-00-00 in source data.',
    example: '',
  },
  {
    key: 'ownerAge',
    header: 'Owner Age',
    label: 'Owner age',
    required: false,
    source: 'tekana',
    description: 'Often unreliable in exports; store for traceability only.',
    example: '',
  },
  {
    key: 'ownerAddress',
    header: 'Owner Address',
    label: 'Owner address',
    required: false,
    source: 'tekana',
    description: 'Postal / physical address if provided.',
    example: '',
  },
  {
    key: 'ownerPhone',
    header: 'Owner Phone',
    label: 'Owner phone',
    required: false,
    source: 'tekana',
    description: 'Farmer contact number.',
    example: '788810914',
  },
  {
    key: 'ownerEmail',
    header: 'Owner Email',
    label: 'Owner email',
    required: false,
    source: 'tekana',
    description: 'Farmer email if provided.',
    example: '',
  },
  {
    key: 'district',
    header: 'District',
    label: 'District',
    required: false,
    source: 'tekana',
    description: 'Rwanda district.',
    example: 'Nyagatare',
  },
  {
    key: 'sector',
    header: 'Sector',
    label: 'Sector',
    required: false,
    source: 'tekana',
    description: 'Rwanda sector.',
    example: 'GATUNDA',
  },
  {
    key: 'cell',
    header: 'Cell',
    label: 'Cell',
    required: false,
    source: 'tekana',
    description: 'Rwanda cell.',
    example: 'Nyangara',
  },
  {
    key: 'village',
    header: 'Village',
    label: 'Village',
    required: false,
    source: 'tekana',
    description: 'Rwanda village.',
    example: 'Mutumba',
  },
  {
    key: 'insurer',
    header: 'Insurer',
    label: 'Insurer',
    required: false,
    source: 'tekana',
    description: 'Insurance company name on Tekana.',
    example: 'Radiant Insurance Company',
  },
  {
    key: 'tekanaStatus',
    header: 'Status',
    aliases: ['tekana status'],
    label: 'Tekana status',
    required: false,
    source: 'tekana',
    description: 'Workflow status on Tekana e.g. Approved for Subsidy.',
    example: 'Approved for Subsidy',
  },
  {
    key: 'tekanaPaidStatus',
    header: 'Paid Status',
    label: 'Tekana paid status',
    required: false,
    source: 'tekana',
    description: 'Subsidy payment status on Tekana.',
    example: 'Not paid for subsidy',
  },
  {
    key: 'tekanaApprovedBy',
    header: 'Approved By',
    label: 'Tekana approved by',
    required: false,
    source: 'tekana',
    description: 'Tekana platform approver (not EzInsure agent).',
    example: 'HAGUMIMANA IIDEPHONSE',
  },
  {
    key: 'tekanaApprovedOn',
    header: 'Approved On',
    label: 'Tekana approved on',
    required: false,
    source: 'tekana',
    description: 'Approval timestamp on Tekana.',
    example: '11/7/2025 10:19',
  },
];

/** Added manually in Excel after Tekana export, before EzInsure upload */
export const EZINSURE_ADDED_COLUMNS: TekanaImportColumn[] = [
  {
    key: 'vetPhone',
    header: 'Vet Phone',
    aliases: ['vet phone', 'vet_phone', 'veterinarian phone'],
    label: 'Vet phone',
    required: true,
    source: 'ezinsure',
    description: 'Assigned veterinarian mobile (+250…). Added by admin after Tekana export.',
    example: '+250788123456',
  },
  {
    key: 'vetEmail',
    header: 'Vet Email',
    aliases: ['vet email', 'vet_email', 'veterinarian email'],
    label: 'Vet email',
    required: true,
    source: 'ezinsure',
    description: 'Assigned veterinarian email. Added by admin after Tekana export.',
    example: 'vet.karim@example.rw',
  },
];

export const TEKANA_IMPORT_COLUMNS: TekanaImportColumn[] = [
  ...TEKANA_EXPORT_COLUMNS,
  ...EZINSURE_ADDED_COLUMNS,
];

const SAMPLE_FILENAME = 'ezinsure_tekana_export_with_vet_columns_sample.csv';

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildSampleCsv(): string {
  const headers = TEKANA_IMPORT_COLUMNS.map((c) => c.header);
  const exampleRow = TEKANA_IMPORT_COLUMNS.map((c) => c.example);
  return [headers, exampleRow].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

/** Sample file: Tekana report headers + Vet Phone / Vet Email (for admins to see expected layout). */
export function downloadTekanaImportSample(): void {
  const csv = buildSampleCsv();
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = SAMPLE_FILENAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** @deprecated Use downloadTekanaImportSample */
export const downloadTekanaImportTemplate = downloadTekanaImportSample;

export const ACCEPTED_IMPORT_EXTENSIONS = ['.csv', '.xlsx', '.xls'] as const;

export function isAcceptedImportFile(file: File): boolean {
  return ACCEPTED_IMPORT_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
}

export const REQUIRED_EZINSURE_HEADERS = EZINSURE_ADDED_COLUMNS.filter((c) => c.required).map(
  (c) => c.header,
);
