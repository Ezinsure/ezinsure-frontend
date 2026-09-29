'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  EXTERNAL_VET_STATUS_LABELS,
  formatRwf,
  type ExternalVetCommissionStatus,
} from '../domain';

const MIN_REASON_LENGTH = 12;

export type WithdrawBatchTarget = {
  batchId: string;
  batchNumber: string;
  status: ExternalVetCommissionStatus;
  payeeName: string;
  periodLabel?: string;
  lineCount: number;
  totalVetCommission: number;
  totalCompanyCommission: number;
};

type Props = {
  open: boolean;
  target: WithdrawBatchTarget | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

export function WithdrawBatchDialog({
  open,
  target,
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  const titleId = useId();
  const reasonId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setTouched(false);
    const t = window.setTimeout(() => textareaRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open, target?.batchId]);

  if (!open || !target) return null;

  const trimmed = reason.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_REASON_LENGTH;
  const missing = trimmed.length === 0;
  const invalid = missing || tooShort;
  const showError = touched && invalid;

  function handleConfirm() {
    setTouched(true);
    if (invalid || busy) return;
    onConfirm(trimmed);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-amber-50/80 via-white to-white px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-800 ring-1 ring-amber-200">
              <Undo2 className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/80">
                Withdraw request
              </p>
              <h2
                id={titleId}
                className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900"
              >
                Return to draft
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pulls this request out of review so you can edit it. Line
                decisions will be cleared.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <dl className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Batch
              </dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {target.batchNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {EXTERNAL_VET_STATUS_LABELS[target.status]}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Payee
              </dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {target.payeeName}
                {target.periodLabel ? (
                  <span className="font-normal text-slate-500">
                    {' '}
                    · {target.periodLabel}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Lines
              </dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {target.lineCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Totals
              </dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                Vet {formatRwf(target.totalVetCommission)} · Co.{' '}
                {formatRwf(target.totalCompanyCommission)}
              </dd>
            </div>
          </dl>

          <div>
            <label
              htmlFor={reasonId}
              className="block text-sm font-medium text-slate-800"
            >
              Reason <span className="text-rose-600">*</span>
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
              Required for audit (at least {MIN_REASON_LENGTH} characters).
            </p>
            <textarea
              id={reasonId}
              ref={textareaRef}
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="Explain why this request is being withdrawn…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
              onBlur={() => setTouched(true)}
            />
            {showError ? (
              <p className="mt-1.5 text-sm text-rose-600">
                {missing
                  ? 'Enter a withdraw reason.'
                  : `Use at least ${MIN_REASON_LENGTH} characters.`}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={busy || invalid}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Undo2 className="mr-2 h-4 w-4" />
            )}
            Withdraw to draft
          </Button>
        </div>
      </div>
    </div>
  );
}
