'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Eye, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';

export interface PaymentProofReviewPayload {
  action: 'approve' | 'reject';
  reasonForPaymentRejection?: string;
}

interface PaymentProofReviewModalProps {
  open: boolean;
  onClose: () => void;
  applicationNumber: string;
  ownerSummary: string;
  expectedAmount: number;
  transactionId?: string;
  proofUrl?: string;
  submittedAt?: string;
  onSubmit: (payload: PaymentProofReviewPayload) => Promise<void>;
  onViewDocument?: (name: string, path: string) => void;
}

export function PaymentProofReviewModal({
  open,
  onClose,
  applicationNumber,
  ownerSummary,
  expectedAmount,
  transactionId,
  proofUrl,
  submittedAt,
  onSubmit,
  onViewDocument,
}: PaymentProofReviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setRejectionReason('');
    setFormError(null);
    setSubmittingAction(null);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const isSubmitting = submittingAction !== null;
  const trimmedReason = rejectionReason.trim();

  const handleAction = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !trimmedReason) {
      setFormError('Please provide a reason when requesting payment action from the veterinarian.');
      return;
    }
    if (action === 'approve' && trimmedReason) {
      setFormError('Clear the action reason before approving payment.');
      return;
    }

    setFormError(null);
    setSubmittingAction(action);
    try {
      await onSubmit({
        action,
        ...(action === 'reject' ? { reasonForPaymentRejection: trimmedReason } : {}),
      });
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not complete payment review.');
    } finally {
      setSubmittingAction(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-slate-900/60 backdrop-blur-[2px]"
        aria-label="Close payment review dialog"
        onClick={onClose}
      />

      <div
        className="relative flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-review-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Payment review
            </p>
            <h3 id="payment-review-modal-title" className="mt-1 text-lg font-semibold text-slate-900">
              Verify payment proof
            </h3>
            <p className="mt-1 truncate text-sm text-slate-600">
              {applicationNumber} · {ownerSummary}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Payment details
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-600">Expected amount</dt>
                <dd className="font-semibold text-slate-900">{formatRwfDisplay(expectedAmount)}</dd>
              </div>
              {transactionId && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Transaction ID</dt>
                  <dd className="font-mono font-medium text-slate-900">{transactionId}</dd>
                </div>
              )}
              {submittedAt && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">Submitted</dt>
                  <dd className="text-slate-900">
                    {new Date(submittedAt).toLocaleString('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </dd>
                </div>
              )}
            </dl>

            {proofUrl && onViewDocument && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => onViewDocument('Payment proof', proofUrl)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View payment proof
              </Button>
            )}
          </div>

          <div className="mt-5">
            <label
              htmlFor="payment-rejection-reason"
              className="block text-sm font-medium text-slate-800"
            >
              Action required reason
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Required only when sending back to the veterinarian for a corrected payment proof.
            </p>
            <textarea
              id="payment-rejection-reason"
              rows={4}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              disabled={isSubmitting}
              placeholder="Explain what must be corrected on the payment proof…"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            />
          </div>

          {formError && (
            <div
              className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
              <p>{formError}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={isSubmitting || !trimmedReason}
            onClick={() => void handleAction('reject')}
          >
            {submittingAction === 'reject' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Request action
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isSubmitting || Boolean(trimmedReason)}
            onClick={() => void handleAction('approve')}
          >
            {submittingAction === 'approve' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Approve payment
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
