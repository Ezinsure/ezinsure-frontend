'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  EXTERNAL_VET_STATUS_LABELS,
  formatRwf,
  type ExternalVetCommissionStatus,
} from '../domain';

const MIN_REASON_LENGTH = 12;

export type FinanceRejectTarget = {
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
  target: FinanceRejectTarget | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

export function FinanceRejectDialog({
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
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-rose-50/80 via-white to-white px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-700 ring-1 ring-rose-200">
              <AlertTriangle className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-700/80">
                Finance rejection
              </p>
              <h2
                id={titleId}
                className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900"
              >
                Reject commission batch
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                This returns the batch to a rejected state. A clear reason is
                required for audit.
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
          <dl className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-sm">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Batch
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {target.batchNumber}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Status
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {EXTERNAL_VET_STATUS_LABELS[target.status]}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                External vet
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
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
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Lines in batch
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {target.lineCount}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Vet commission
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {formatRwf(target.totalVetCommission)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Company commission
              </dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {formatRwf(target.totalCompanyCommission)}
              </dd>
            </div>
          </dl>

          <div>
            <label
              htmlFor={reasonId}
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
            >
              Reason for rejection <span className="text-rose-600">*</span>
            </label>
            <textarea
              id={reasonId}
              ref={textareaRef}
              rows={4}
              value={reason}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Explain why finance is rejecting this batch (e.g. incorrect line amounts, missing documentation, duplicate claim)…"
              className={`w-full resize-y rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:opacity-60 ${
                showError
                  ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-slate-500 focus:ring-slate-200'
              }`}
              aria-invalid={showError}
              aria-describedby={showError ? `${reasonId}-error` : undefined}
            />
            <div className="mt-1.5 flex items-start justify-between gap-3">
              {showError ? (
                <p id={`${reasonId}-error`} className="text-xs text-rose-600">
                  {missing
                    ? 'A rejection reason is required.'
                    : `Please provide at least ${MIN_REASON_LENGTH} characters.`}
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Visible to admin audit history. Be specific and professional.
                </p>
              )}
              <p className="shrink-0 text-xs tabular-nums text-slate-400">
                {trimmed.length}/{MIN_REASON_LENGTH}+
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-5 py-4">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={busy || (touched && invalid)}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Reject batch
          </Button>
        </div>
      </div>
    </div>
  );
}
