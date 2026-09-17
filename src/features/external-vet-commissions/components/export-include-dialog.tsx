'use client';

import { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  EXPORT_LINE_INCLUDE_OPTIONS,
  filterLinesByIncludeStatus,
  type ExportLineIncludeFilter,
  type ExternalVetLineStatus,
} from '../domain';

type LineLike = { lineStatus: ExternalVetLineStatus };

type Props<T extends LineLike> = {
  open: boolean;
  lines: T[];
  busy?: boolean;
  onClose: () => void;
  onExportExcel: (filtered: T[], include: ExportLineIncludeFilter) => void | Promise<void>;
  onExportPdf: (filtered: T[], include: ExportLineIncludeFilter) => void | Promise<void>;
};

export function ExportIncludeDialog<T extends LineLike>({
  open,
  lines,
  busy = false,
  onClose,
  onExportExcel,
  onExportPdf,
}: Props<T>) {
  const [include, setInclude] = useState<ExportLineIncludeFilter>('ALL');
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const counts = useMemo(() => {
    const all = lines.length;
    const approved = lines.filter((l) => l.lineStatus === 'APPROVED').length;
    const rejected = lines.filter((l) => l.lineStatus === 'REJECTED').length;
    const pending = lines.filter((l) => l.lineStatus === 'PENDING_REVIEW').length;
    return { all, approved, rejected, pending };
  }, [lines]);

  const filteredCount = useMemo(
    () => filterLinesByIncludeStatus(lines, include).length,
    [include, lines],
  );

  if (!open) return null;

  const countFor = (value: ExportLineIncludeFilter): number => {
    switch (value) {
      case 'APPROVED':
        return counts.approved;
      case 'REJECTED':
        return counts.rejected;
      case 'PENDING_REVIEW':
        return counts.pending;
      default:
        return counts.all;
    }
  };

  const run = async (kind: 'excel' | 'pdf') => {
    if (busy || exporting) return;
    const filtered = filterLinesByIncludeStatus(lines, include);
    if (!filtered.length) return;
    setExporting(kind);
    try {
      if (kind === 'excel') {
        await onExportExcel(filtered, include);
      } else {
        await onExportPdf(filtered, include);
      }
      onClose();
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-include-title"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Export
            </p>
            <h2
              id="export-include-title"
              className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900"
            >
              Choose which lines to include
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Filter by line review status before generating Excel or PDF.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(exporting) || busy}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
          {EXPORT_LINE_INCLUDE_OPTIONS.map((option) => {
            const count = countFor(option.value);
            const selected = include === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition ${
                  selected
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900/10'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <input
                  type="radio"
                  name="export-include"
                  className="mt-1"
                  checked={selected}
                  onChange={() => setInclude(option.value)}
                  disabled={Boolean(exporting) || busy}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {option.label}
                    </span>
                    <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                      {count}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-slate-500 sm:text-sm">
            {filteredCount === 0
              ? 'No lines match this filter.'
              : `${filteredCount} line${filteredCount === 1 ? '' : 's'} will be exported.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={Boolean(exporting) || busy}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => void run('excel')}
              disabled={filteredCount === 0 || Boolean(exporting) || busy}
              className="flex-1 gap-1.5 sm:flex-none"
            >
              {exporting === 'excel' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              )}
              Excel
            </Button>
            <Button
              onClick={() => void run('pdf')}
              disabled={filteredCount === 0 || Boolean(exporting) || busy}
              className="flex-1 gap-1.5 sm:flex-none"
            >
              {exporting === 'pdf' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
