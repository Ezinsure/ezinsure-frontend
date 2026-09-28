'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  EXTERNAL_VET_REVIEW_STAGE_LABELS,
  type ExternalVetReviewStage,
} from '../domain';

export type LineReviewDecision = 'APPROVED' | 'REJECTED';

type Props = {
  open: boolean;
  decision: LineReviewDecision | null;
  lineLabel: string;
  stage: ExternalVetReviewStage;
  /** Number of lines when bulk reviewing (omit / 1 for single). */
  lineCount?: number;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    decision: LineReviewDecision;
    reason?: string;
  }) => void | Promise<void>;
};

export function LineReviewDialog({
  open,
  decision,
  lineLabel,
  stage,
  lineCount = 1,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setError(null);
  }, [open, decision]);

  if (!open || !decision) return null;

  const isReject = decision === 'REJECTED';
  const plural = lineCount > 1;
  const stageLabel = EXTERNAL_VET_REVIEW_STAGE_LABELS[stage];

  const submit = async () => {
    if (isReject && !reason.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    setError(null);
    await onConfirm({
      decision,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="line-review-title"
        className="flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {stageLabel} line review
            </p>
            <h2
              id="line-review-title"
              className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900"
            >
              {isReject
                ? plural
                  ? `Reject ${lineCount} lines`
                  : 'Reject line'
                : plural
                  ? `Approve ${lineCount} lines`
                  : 'Approve line'}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500" title={lineLabel}>
              {lineLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-5">
          <p className="text-sm leading-relaxed text-slate-600">
            {isReject
              ? 'Rejected lines are excluded from payable and SONARWA reclaim totals. Your reason stays visible to every portal.'
              : 'Approved lines count toward payable commission for this application.'}
          </p>

          {isReject ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Rejection reason <span className="text-rose-600">*</span>
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                disabled={busy}
                placeholder="Explain why this insured animal / line is rejected…"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </label>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Note (optional)
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                disabled={busy}
                placeholder="Optional comment for the audit trail…"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </label>
          )}

          {error ? (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={busy}
            className={`w-full sm:w-auto ${
              isReject
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : ''
            }`}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isReject ? (
              <XCircle className="mr-2 h-4 w-4" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {isReject ? 'Confirm rejection' : 'Confirm approval'}
          </Button>
        </div>
      </div>
    </div>
  );
}
