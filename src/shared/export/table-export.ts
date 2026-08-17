import type { ExportTableOptions } from '@/shared/export/types';
import { buildExportTimestamp, sanitizeFilenameSegment } from '@/shared/export/formatters';

const BRAND_COLOR: [number, number, number] = [10, 37, 64];

function buildFilename(base: string, extension: 'xlsx' | 'pdf'): string {
  const safe = sanitizeFilenameSegment(base);
  return `${safe}_${buildExportTimestamp()}.${extension}`;
}

/** Export rows to an Excel workbook (client-side download). */
export async function exportTableToExcel<T>(options: ExportTableOptions<T>): Promise<void> {
  if (options.rows.length === 0) {
    throw new Error('No data to export');
  }

  const XLSX = await import('@e965/xlsx');

  const sheetRows = options.rows.map((row) => {
    const record: Record<string, string | number> = {};
    for (const column of options.columns) {
      record[column.header] = column.getValue(row);
    }
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName ?? 'Data');

  XLSX.writeFile(workbook, buildFilename(options.filenameBase, 'xlsx'));
}

/** Export rows to a branded PDF report with optional context and summary blocks. */
export async function exportTableToPdf<T>(options: ExportTableOptions<T>): Promise<void> {
  if (options.rows.length === 0) {
    throw new Error('No data to export');
  }

  const { jsPDF } = await import('jspdf');
  const autoTable = await import('jspdf-autotable');

  const orientation = options.pdfOrientation ?? 'landscape';
  const doc = new jsPDF(orientation, 'mm', 'a4');

  const marginX = 14;
  let cursorY = 18;

  doc.setFontSize(18);
  doc.setTextColor(...BRAND_COLOR);
  doc.text(options.title, marginX, cursorY);
  cursorY += 8;

  if (options.subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(options.subtitle, marginX, cursorY);
    cursorY += 6;
  }

  const generatedAt = new Date().toLocaleString();
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${generatedAt}`, marginX, cursorY);
  cursorY += 6;

  if (options.contextLines?.length) {
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    for (const line of options.contextLines) {
      doc.text(line, marginX, cursorY);
      cursorY += 5;
    }
  }

  if (options.summaryLines?.length) {
    cursorY += 2;
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    for (const line of options.summaryLines) {
      doc.text(line, marginX, cursorY);
      cursorY += 5;
    }
  }

  const head = [options.columns.map((col) => col.header)];
  const body = options.rows.map((row) =>
    options.columns.map((col) => {
      const value = col.getValue(row);
      return typeof value === 'number' ? value.toLocaleString('en-US') : String(value);
    }),
  );

  autoTable.default(doc, {
    startY: cursorY + 4,
    head,
    body,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: BRAND_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: options.columns.reduce<Record<number, { cellWidth: number }>>((acc, col, index) => {
      if (col.pdfWidth) {
        acc[index] = { cellWidth: col.pdfWidth };
      }
      return acc;
    }, {}),
    margin: { left: marginX, right: marginX },
  });

  doc.save(buildFilename(options.filenameBase, 'pdf'));
}
