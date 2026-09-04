'use client';

import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatRwf } from '../domain';

export type ReimbursementConfirmMode = 'prepare_reclaim' | 'mark_reimbursed';

type Props = {
  open: boolean;
  mode: ReimbursementConfirmMode;
  lineCount: number;
  batchCount: number;
  vetCount: number;
  totalVetCommission: number;
  totalCompanyCommission: number;
  exportReference: string;
  onExportReferenceChange: (value: string) => void;
  reimbursedAt: string;
  onReimbursedAtChange: (value: string) => void;
  reimbursementReference: string;
  onReimbursementReferenceChange: (value: string) => void;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReimbursementConfirmDialog({
  open,
  mode,
  lineCount,
  batchCount,
  vetCount,
  totalVetCommission,
  totalCompanyCommission,
  exportReference,
  onExportReferenceChange,
  reimbursedAt,
  onReimbursedAtChange,
  reimbursementReference,
  onReimbursementReferenceChange,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;

  const isPrepare = mode === 'prepare_reclaim';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reimbursement-confirm-title"
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Confirm action
            </p>
            <h2
              id="reimbursement-confirm-title"
              className="mt-1 text-lg font-semibold text-slate-900"
            >
              {isPrepare
                ? 'Prepare SONARWA reclaim'
                : 'Mark reimbursed by SONARWA'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-slate-600">
            {isPrepare
              ? 'Selected batches will move to Awaiting SONARWA reimbursement, and an Excel reclaim file will download.'
              : 'Selected batches will move to Reimbursed by SONARWA. This should only be done after SONARWA has settled the reclaim.'}
          </p>

          <dl className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Lines
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{lineCount}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Batches
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {batchCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                External vets
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{vetCount}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Vet commission
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {formatRwf(totalVetCommission)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Company commission
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {formatRwf(totalCompanyCommission)}
              </dd>
            </div>
          </dl>

          {isPrepare ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Export reference (optional)
              </span>
              <input
                type="text"
                value={exportReference}
                onChange={(e) => onExportReferenceChange(e.target.value)}
                placeholder="e.g. reclaim-2026-03-W1"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
                disabled={busy}
              />
            </label>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Reimbursement date
                </span>
                <input
                  type="date"
                  value={reimbursedAt}
                  onChange={(e) => onReimbursedAtChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  disabled={busy}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Remittance / bank reference (optional)
                </span>
                <input
                  type="text"
                  value={reimbursementReference}
                  onChange={(e) =>
                    onReimbursementReferenceChange(e.target.value)
                  }
                  placeholder="e.g. bank transfer ref"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  disabled={busy}
                />
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isPrepare ? 'Prepare & download Excel' : 'Confirm reimbursed'}
          </Button>
        </div>
      </div>
    </div>
  );
}
