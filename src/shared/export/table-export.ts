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

  const workbook = XLSX.utils.book_new();

  const summaryRows: Array<Record<string, string>> = [
    { Field: 'Title', Value: options.title },
  ];
  if (options.subtitle) {
    summaryRows.push({ Field: 'Subtitle', Value: options.subtitle });
  }
  summaryRows.push({ Field: 'Generated', Value: new Date().toLocaleString() });
  for (const line of options.contextLines ?? []) {
    const [field, ...rest] = line.split(':');
    summaryRows.push({
      Field: (field ?? 'Context').trim(),
      Value: rest.length ? rest.join(':').trim() : line,
    });
  }
  for (const line of options.summaryLines ?? []) {
    const [field, ...rest] = line.split(':');
    summaryRows.push({
      Field: (field ?? 'Summary').trim(),
      Value: rest.length ? rest.join(':').trim() : line,
    });
  }

  if (summaryRows.length > 2) {
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  }

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
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
  const pageWidth = doc.internal.pageSize.getWidth();

  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = 12;

  // Brand header bar
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(options.title, marginX, 12);

  if (options.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(210, 220, 235);
    doc.text(options.subtitle, marginX, 19);
  }

  doc.setFontSize(8);
  doc.setTextColor(180, 195, 215);
  doc.text(`Generated ${new Date().toLocaleString()}`, pageWidth - marginX, 12, {
    align: 'right',
  });

  cursorY = 36;

  const metaLines = [...(options.contextLines ?? []), ...(options.summaryLines ?? [])];
  if (metaLines.length) {
    const boxTop = cursorY;
    const rowHeight = 5.2;
    const boxPadding = 4;
    const boxHeight = boxPadding * 2 + metaLines.length * rowHeight;

    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(220, 226, 234);
    doc.roundedRect(marginX, boxTop, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    let lineY = boxTop + boxPadding + 3.2;

    for (const line of metaLines) {
      const separator = line.indexOf(':');
      if (separator > 0) {
        const label = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim();
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BRAND_COLOR);
        doc.text(`${label}:`, marginX + 4, lineY);
        const labelWidth = doc.getTextWidth(`${label}: `);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        doc.text(value, marginX + 4 + labelWidth, lineY);
      } else {
        doc.setTextColor(55, 65, 81);
        doc.text(line, marginX + 4, lineY);
      }
      lineY += rowHeight;
    }

    cursorY = boxTop + boxHeight + 6;
  }

  const head = [options.columns.map((col) => col.header)];
  const body = options.rows.map((row) =>
    options.columns.map((col) => {
      const value = col.getValue(row);
      return typeof value === 'number' ? value.toLocaleString('en-US') : String(value);
    }),
  );

  autoTable.default(doc, {
    startY: cursorY,
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
