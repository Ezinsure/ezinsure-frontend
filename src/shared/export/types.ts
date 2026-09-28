/** Column definition for generic table exports (Excel / PDF). */
export interface ExportColumn<T> {
  /** Column header shown in exports */
  header: string;
  /** Cell value — string or number for spreadsheet compatibility */
  getValue: (row: T) => string | number;
  /** Optional PDF column width hint */
  pdfWidth?: number;
}

export interface ExportReportMeta {
  title: string;
  subtitle?: string;
  /** Key-value lines shown above the table (filters, date range, etc.) */
  contextLines?: string[];
  /** Summary lines below context (totals) */
  summaryLines?: string[];
  filenameBase: string;
  sheetName?: string;
  /** PDF orientation — default landscape for wide tables */
  pdfOrientation?: 'portrait' | 'landscape';
}

export interface ExportTableOptions<T> extends ExportReportMeta {
  columns: ExportColumn<T>[];
  rows: T[];
}
