export type ImportColumnSource = 'tekana' | 'ezinsure';

export interface TekanaImportColumn {
  /** Internal field key (MongoDB / API) */
  key: string;
  /** Canonical CSV header text */
  header: string;
  /** Alternate headers (case/spacing variants) */
  aliases?: string[];
  label: string;
  required: boolean;
  source: ImportColumnSource;
  description: string;
  example: string;
}

export interface ParsedImportRow {
  rowNumber: number;
  values: Record<string, string>;
  /** Original CSV header → cell value (full Tekana traceability) */
  raw: Record<string, string>;
}

export interface ParseTekanaCsvResult {
  rows: ParsedImportRow[];
  /** Required EzInsure headers missing from the file */
  missingEzinsureHeaders: string[];
}

export interface TekanaMassUploadResponse {
  message: string;
  created: number;
  skipped: number;
  errors: unknown[];
}
