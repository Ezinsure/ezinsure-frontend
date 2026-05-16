'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { simulateTekanaImport } from '@/features/livestock-import/mock-import';
import { parseTekanaCsv } from '@/features/livestock-import/parse-csv';
import {
  ACCEPTED_IMPORT_EXTENSIONS,
  downloadTekanaImportTemplate,
  isAcceptedImportFile,
  TEKANA_IMPORT_COLUMNS,
} from '@/features/livestock-import/template';
import type { LivestockImportResult, ParsedImportRow } from '@/features/livestock-import/types';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadgeClass(status: 'created' | 'skipped' | 'failed'): string {
  switch (status) {
    case 'created':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'skipped':
      return 'bg-amber-50 text-amber-900 ring-amber-200';
    case 'failed':
      return 'bg-red-50 text-red-800 ring-red-200';
    default:
      return 'bg-slate-50 text-slate-700 ring-slate-200';
  }
}

export default function LivestockImportView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<ParsedImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<LivestockImportResult | null>(null);

  const assignFile = useCallback(async (next: File | null) => {
    setFileError(null);
    setResult(null);

    if (!next) {
      setFile(null);
      setPreviewRows([]);
      return;
    }

    if (!isAcceptedImportFile(next)) {
      setFile(null);
      setPreviewRows([]);
      setFileError(`Use ${ACCEPTED_IMPORT_EXTENSIONS.join(', ')} only.`);
      return;
    }

    setFile(next);

    if (next.name.toLowerCase().endsWith('.csv')) {
      try {
        const text = await next.text();
        setPreviewRows(parseTekanaCsv(text).slice(0, 5));
      } catch {
        setPreviewRows([]);
        setFileError('Could not read the CSV file for preview.');
      }
    } else {
      setPreviewRows([]);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) void assignFile(dropped);
    },
    [assignFile],
  );

  const handleImport = async () => {
    if (!file) {
      setFileError('Choose or drop a file before importing.');
      return;
    }

    setIsImporting(true);
    setFileError(null);

    try {
      let parsed: ParsedImportRow[] = previewRows;
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        parsed = parseTekanaCsv(text);
      }

      const importResult = await simulateTekanaImport(file, parsed);
      setResult(importResult);
    } catch {
      setFileError('Import simulation failed. Try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewRows([]);
    setResult(null);
    setFileError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Livestock · Tekana
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">
              Import from Tekana
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 leading-relaxed">
              Upload a spreadsheet exported from Tekana to create livestock applications in bulk.
              Download the template first so your columns match the expected format.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="md"
            icon={<Download className="h-4 w-4" />}
            onClick={downloadTekanaImportTemplate}
            className="shrink-0"
          >
            Download template
          </Button>
        </header>

        <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Simulated import (demo mode)</p>
          <p className="mt-1 text-amber-900/90">
            Results below are hardcoded for UI testing. The real API will validate Tekana tags,
            insured values, and duplicate transaction references.
          </p>
        </div>

        <section className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={[
                'relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors',
                isDragging
                  ? 'border-[var(--main-blue)] bg-blue-50/50'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50',
                file ? 'border-emerald-300 bg-emerald-50/30' : '',
              ].join(' ')}
            >
              <input
                ref={inputRef}
                type="file"
                className="sr-only"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => void assignFile(e.target.files?.[0] ?? null)}
              />

              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <FileSpreadsheet className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    <X className="h-4 w-4" />
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-[var(--main-blue)]">
                    <Upload className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Drag and drop your file here
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      or click to browse · CSV, XLSX, or XLS
                    </p>
                  </div>
                </div>
              )}
            </div>

            {fileError && (
              <p className="flex items-center gap-2 text-sm text-red-600" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {fileError}
              </p>
            )}

            {previewRows.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  CSV preview (first {previewRows.length} rows)
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500">
                        <th className="py-2 pr-3 font-medium">Row</th>
                        <th className="py-2 pr-3 font-medium">Tekana tag</th>
                        <th className="py-2 pr-3 font-medium">Owner</th>
                        <th className="py-2 font-medium">Insured (RWF)</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-800">
                      {previewRows.map((row) => (
                        <tr key={row.rowNumber} className="border-b border-slate-50">
                          <td className="py-2 pr-3">{row.rowNumber}</td>
                          <td className="py-2 pr-3 font-mono">{row.values.tekanaTagId || '—'}</td>
                          <td className="py-2 pr-3">{row.values.ownerFullName || '—'}</td>
                          <td className="py-2">{row.values.insuredValueRwf || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {file && !file.name.toLowerCase().endsWith('.csv') && (
              <p className="text-sm text-slate-500">
                Excel preview will be available when the backend parser is connected. You can still
                run a simulated import.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={!file || isImporting}
                onClick={() => void handleImport()}
                className="min-w-[160px]"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  'Run import'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={reset} disabled={isImporting}>
                Reset
              </Button>
            </div>
          </div>

          <aside className="lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Expected columns</h2>
              <p className="mt-1 text-xs text-slate-500">
                Required fields must be present in the header row. Use the template for exact names.
              </p>
              <ul className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1 text-xs">
                {TEKANA_IMPORT_COLUMNS.map((col) => (
                  <li key={col.key} className="border-b border-slate-50 pb-3 last:border-0">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-800">
                        {col.header}
                      </code>
                      {col.required ? (
                        <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                          Required
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          Optional
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-slate-600">{col.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>

        {result && (
          <section
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            aria-live="polite"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{result.message}</h2>
                  <p className="text-sm text-slate-500">
                    Batch ID: <span className="font-mono">{result.importBatchId}</span>
                  </p>
                </div>
              </div>
              <Link
                href="/admin/livestock/applications"
                className="text-sm font-medium text-[var(--main-blue)] hover:underline"
              >
                View applications →
              </Link>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Total rows', value: result.summary.totalRows },
                { label: 'Created', value: result.summary.created },
                { label: 'Skipped', value: result.summary.skipped },
                { label: 'Failed', value: result.summary.failed },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                >
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</dd>
                </div>
              ))}
            </dl>

            {result.errors.length > 0 && (
              <ul className="mt-4 space-y-1 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-950">
                {result.errors.map((err) => (
                  <li key={err} className="flex gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {err}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Row</th>
                    <th className="px-4 py-3 font-medium">Tekana tag</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.rows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.tekanaTagId}`} className="text-slate-800">
                      <td className="px-4 py-3">{row.rowNumber}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.tekanaTagId}</td>
                      <td className="px-4 py-3">{row.ownerFullName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {row.applicationNumber && (
                          <span className="font-medium text-slate-900">{row.applicationNumber}</span>
                        )}
                        {row.reason && <span>{row.reason}</span>}
                        {!row.applicationNumber && !row.reason && '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
