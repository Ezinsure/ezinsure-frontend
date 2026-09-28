'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DataExportActionsProps {
  onExportExcel: () => void | Promise<void>;
  onExportPdf: () => void | Promise<void>;
  disabled?: boolean;
  excelLabel?: string;
  pdfLabel?: string;
  className?: string;
}

/**
 * Reusable export control — Excel + PDF buttons with loading state.
 * Use with shared/export helpers for consistent reports across the app.
 */
export function DataExportActions({
  onExportExcel,
  onExportPdf,
  disabled = false,
  excelLabel = 'Export Excel',
  pdfLabel = 'Export PDF',
  className = '',
}: DataExportActionsProps) {
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const runExport = async (kind: 'excel' | 'pdf', handler: () => void | Promise<void>) => {
    if (disabled || exporting) return;
    setExporting(kind);
    try {
      await handler();
    } finally {
      setExporting(null);
    }
  };

  const isBusy = Boolean(exporting);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || isBusy}
        className="h-8 gap-1.5 border-slate-300 text-xs font-medium text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800"
        onClick={() => void runExport('excel', onExportExcel)}
      >
        {exporting === 'excel' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-3.5 w-3.5" />
        )}
        {excelLabel}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || isBusy}
        className="h-8 gap-1.5 border-slate-300 text-xs font-medium text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800"
        onClick={() => void runExport('pdf', onExportPdf)}
      >
        {exporting === 'pdf' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="h-3.5 w-3.5" />
        )}
        {pdfLabel}
      </Button>
    </div>
  );
}
