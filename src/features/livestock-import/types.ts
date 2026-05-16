export type LivestockImportRowStatus = 'created' | 'skipped' | 'failed';

export interface TekanaImportColumn {
  key: string;
  header: string;
  label: string;
  required: boolean;
  description: string;
  example: string;
}

export interface ParsedImportRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface LivestockImportRowResult {
  rowNumber: number;
  tekanaTagId: string;
  ownerFullName: string;
  status: LivestockImportRowStatus;
  reason?: string;
  applicationNumber?: string;
}

export interface LivestockImportSummary {
  totalRows: number;
  created: number;
  skipped: number;
  failed: number;
  duplicateTransactionRefs: number;
}

export interface LivestockImportResult {
  importBatchId: string;
  message: string;
  simulated: true;
  summary: LivestockImportSummary;
  rows: LivestockImportRowResult[];
  errors: string[];
}
