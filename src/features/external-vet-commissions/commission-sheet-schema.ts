/**
 * Canonical schema for the SONARWA / ezInsure livestock commission claim form.
 *
 * The same form ships in two languages (see `public/templates/`):
 *   - Kinyarwanda: "Ifishi yo gusaba Komisiyo y'ubwishingizi bw'amatungo"
 *   - English:     "Commission Claim Form"
 *
 * Both use an identical 15-column table under section 2. Only that table is
 * read on upload — the identification, declaration and signature blocks are
 * ignored. This module holds the language-agnostic column definitions plus the
 * text matching helpers used to recognise a header no matter how the vet typed
 * it (translated, abbreviated, re-cased, or lightly misspelled).
 */

import type { ExternalVetCommissionLine } from './domain';

/** Line fields that come straight from a claim-form column. */
export type SheetLineField = Extract<
  keyof ExternalVetCommissionLine,
  | 'microchipNumber'
  | 'prodDate'
  | 'branch'
  | 'effecDate'
  | 'expiryDate'
  | 'contract'
  | 'typeLivestock'
  | 'clientId'
  | 'clientName'
  | 'clientDistrict'
  | 'clientSector'
  | 'sumInsured'
  | 'netPremium'
  | 'vetCommission'
>;

export type ClaimFormLanguage = 'en' | 'rw';

type ColumnDefinition = {
  field: SheetLineField;
  /** English label shown in the UI and in exports. */
  label: string;
  /** Zero-based position in the official template, used as a last-resort match. */
  templateIndex: number;
  /** Header text as printed in each official template. */
  official: Record<ClaimFormLanguage, string>;
  /** Extra spellings accepted from hand-edited or legacy sheets. */
  aliases?: string[];
  /** Numeric columns are parsed as amounts rather than free text. */
  numeric?: boolean;
  /** A table without these columns cannot be imported. */
  required?: boolean;
};

/**
 * Column order matches the official template exactly. Index 0 in the sheet is
 * the "N°" counter, which is display-only and never sent to the backend, so
 * data columns start at template index 1.
 */
export const CLAIM_FORM_COLUMNS: ColumnDefinition[] = [
  {
    field: 'microchipNumber',
    label: 'Microchip / Tag number',
    templateIndex: 1,
    official: {
      en: 'Microchip Number / Tag/Ear Tag',
      rw: 'Nimero ya Microchip / Tag',
    },
    aliases: ['microchip', 'tag number', 'ear tag', 'nimero ya microchip'],
  },
  {
    field: 'prodDate',
    label: 'Production date',
    templateIndex: 2,
    official: { en: 'Production Date', rw: "Itariki y'Itangwa" },
    aliases: ['proddate', 'date of production', 'itariki yitangwa'],
  },
  {
    field: 'branch',
    label: 'Branch / production district',
    templateIndex: 3,
    official: {
      en: 'Branch / Production District',
      rw: 'Ishami / Akarere byakoreweho',
    },
    aliases: ['branch', 'production district', 'ishami', 'akarere byakoreweho'],
  },
  {
    field: 'effecDate',
    label: 'Effective date',
    templateIndex: 4,
    official: { en: 'Effective Date', rw: 'Itariki Itangira' },
    aliases: ['effecdate', 'start date', 'itariki itangira'],
  },
  {
    field: 'expiryDate',
    label: 'Expiry date',
    templateIndex: 5,
    official: { en: 'Expiry Date', rw: 'Itariki Irangira' },
    aliases: ['expdate', 'end date', 'itariki irangira'],
  },
  {
    field: 'contract',
    label: 'Contract number',
    templateIndex: 6,
    official: { en: 'Contract Number', rw: "Nimero y'Amasezerano" },
    aliases: ['contract', 'policy number', 'nimero yamasezerano', 'amasezerano'],
    required: true,
  },
  {
    field: 'typeLivestock',
    label: 'Livestock type',
    templateIndex: 7,
    official: { en: 'Livestock Type', rw: "Ubwoko bw'Itungo" },
    aliases: ['type livestock', 'animal type', 'ubwoko bwitungo', 'ubwoko'],
  },
  {
    field: 'clientId',
    label: 'Client ID',
    templateIndex: 8,
    official: { en: 'Client ID', rw: "Indangamuntu y'Umukiriya" },
    aliases: ['clientid', 'client no', 'national id', 'indangamuntu'],
  },
  {
    field: 'clientName',
    label: 'Client name',
    templateIndex: 9,
    official: { en: 'Client Name', rw: "Amazina y'Umukiriya" },
    aliases: ['clientname', 'insured name', 'owner name', 'amazina yumukiriya'],
    required: true,
  },
  {
    field: 'clientDistrict',
    label: 'Client district',
    templateIndex: 10,
    official: { en: 'Client District', rw: "Akarere k'Umukiriya" },
    aliases: ['akarere kumukiriya', 'district of client'],
  },
  {
    field: 'clientSector',
    label: 'Client sector',
    templateIndex: 11,
    official: { en: 'Client Sector', rw: "Umurenge w'Umukiriya" },
    aliases: ['umurenge wumukiriya', 'sector of client', 'umurenge'],
  },
  {
    field: 'sumInsured',
    label: 'Sum insured (RWF)',
    templateIndex: 12,
    official: { en: 'Sum Insured (RWF)', rw: 'Umubare Wishingiwe (RWF)' },
    aliases: ['suminsured', 'sum assured', 'umubare wishingiwe'],
    numeric: true,
  },
  {
    field: 'netPremium',
    label: 'Net premium (RWF)',
    templateIndex: 13,
    official: { en: 'Net Premium (RWF)', rw: 'Umusanzu Nyawo (RWF)' },
    aliases: ['netpremium', 'premium', 'umusanzu nyawo', 'umusanzu'],
    numeric: true,
    required: true,
  },
  {
    field: 'vetCommission',
    label: 'Agent commission (RWF)',
    templateIndex: 14,
    official: {
      en: 'Agent Commission (RWF)',
      rw: "Komisiyo y'Umuganga w' amatungo (RWF)",
    },
    aliases: [
      'commission',
      'vet commission',
      'agent commission',
      'komisiyo',
      'komisiyo yumuganga',
    ],
    numeric: true,
    required: true,
  },
];

export const CLAIM_FORM_FIELDS = CLAIM_FORM_COLUMNS.map((c) => c.field);

export const REQUIRED_CLAIM_FORM_FIELDS = CLAIM_FORM_COLUMNS.filter(
  (c) => c.required,
).map((c) => c.field);

export const NUMERIC_CLAIM_FORM_FIELDS = new Set<SheetLineField>(
  CLAIM_FORM_COLUMNS.filter((c) => c.numeric).map((c) => c.field),
);

/** Total number of columns in the official table, including the "N°" counter. */
export const CLAIM_FORM_COLUMN_COUNT = 15;

/**
 * Heading that introduces the table. The parser starts looking for column
 * headers immediately after this line and ignores everything above it.
 */
const SECTION_HEADINGS = [
  "2. urutonde rw'amatungo yashyizwe mu bwishingizi",
  '2. list of contracts / policies for which commission is claimed',
  'urutonde rwamatungo yashyizwe mu bwishingizi',
  'list of contracts',
  'policies for which commission is claimed',
];

/** Footer row that closes the table in either language. */
const TOTAL_LABELS = ['total', 'totals', 'igiteranyo'];

/** Words that carry no meaning when comparing headers. */
const STOP_WORDS = new Set([
  'ya',
  'y',
  'wa',
  'w',
  'bwa',
  'bw',
  'rwa',
  'rw',
  'ka',
  'k',
  'ku',
  'mu',
  'na',
  'the',
  'of',
  'for',
  'and',
  'no',
  'nr',
]);

/**
 * Lowercase, strip accents and punctuation, drop currency units and collapse
 * whitespace. `"Umusanzu Nyawo (RWF)"` becomes `"umusanzu nyawo"`.
 */
export function normalizeHeaderText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u02bc`]/g, "'")
    .toLowerCase()
    .replace(/\((?:rwf|frw)\)/g, ' ')
    .replace(/\b(?:rwf|frw)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Normalized text with all separators removed, for exact comparison. */
function compact(value: string): string {
  return normalizeHeaderText(value).replace(/ /g, '');
}

function meaningfulTokens(value: string): string[] {
  return normalizeHeaderText(value)
    .split(' ')
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  return shared / (setA.size + setB.size - shared);
}

/**
 * Similarity between a sheet header and one accepted spelling, from 0 to 100.
 * Exact text wins outright; otherwise we reward containment and shared words so
 * that partial or reordered headers still resolve to the right column.
 */
function similarity(header: string, candidate: string): number {
  const headerCompact = compact(header);
  const candidateCompact = compact(candidate);
  if (!headerCompact || !candidateCompact) return 0;
  if (headerCompact === candidateCompact) return 100;

  const [shorter, longer] =
    headerCompact.length <= candidateCompact.length
      ? [headerCompact, candidateCompact]
      : [candidateCompact, headerCompact];

  if (longer.includes(shorter)) {
    const coverage = shorter.length / longer.length;
    // Require a meaningful overlap so "itariki" alone cannot claim a date column.
    if (coverage >= 0.5) return 70 + coverage * 20;
  }

  return jaccard(meaningfulTokens(header), meaningfulTokens(candidate)) * 65;
}

/** Best score for a header against every accepted spelling of one column. */
export function scoreHeaderAgainstColumn(
  header: string,
  column: ColumnDefinition,
): { score: number; language?: ClaimFormLanguage } {
  let best = 0;
  let language: ClaimFormLanguage | undefined;

  for (const lang of ['en', 'rw'] as const) {
    const score = similarity(header, column.official[lang]);
    if (score > best) {
      best = score;
      language = lang;
    }
  }
  for (const alias of column.aliases ?? []) {
    const score = similarity(header, alias);
    if (score > best) {
      best = score;
      language = undefined;
    }
  }

  return { score: best, language };
}

export function isSectionHeading(value: string): boolean {
  const text = compact(value);
  if (!text) return false;
  return SECTION_HEADINGS.some((heading) => text.includes(compact(heading)));
}

export function isTotalLabel(value: string): boolean {
  const text = compact(value);
  if (!text) return false;
  return TOTAL_LABELS.some((label) => text === label || text.startsWith(label));
}

/** True for the "N°" counter column, which is display-only. */
export function isRowNumberHeader(value: string): boolean {
  const text = compact(value);
  return text === 'n' || text === 'no' || text === 'nº' || text === 'sn';
}
