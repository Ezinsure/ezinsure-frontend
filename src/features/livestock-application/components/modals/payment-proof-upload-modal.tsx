'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Upload, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/file-input';
import { Input } from '@/components/ui/input';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';

const ALLOWED_PAYMENT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const PAYMENT_EXT_PATTERN = /\.(jpe?g|png|pdf)$/i;

export interface PaymentProofUploadPayload {
  proofOfPayment: File;
  transactionId: string;
  amount: number;
  notes?: string;
}

interface PaymentProofUploadModalProps {
  open: boolean;
  onClose: () => void;
  applicationNumber: string;
  ownerSummary: string;
  expectedAmount: number;
  invoiceUrl?: string;
  existingProofUrl?: string;
  existingTransactionId?: string;
  onSubmit: (payload: PaymentProofUploadPayload) => Promise<void>;
}

export function PaymentProofUploadModal({
  open,
  onClose,
  applicationNumber,
  ownerSummary,
  expectedAmount,
  invoiceUrl,
  existingProofUrl,
  existingTransactionId,
  onSubmit,
}: PaymentProofUploadModalProps) {
  const [mounted, setMounted] = useState(false);
  const [transactionId, setTransactionId] = useState(existingTransactionId ?? '');
  const [amount, setAmount] = useState(String(expectedAmount || ''));
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTransactionId(existingTransactionId ?? '');
    setAmount(String(expectedAmount || ''));
    setNotes('');
    setProofFile(null);
    setFileError(null);
    setFormError(null);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, existingTransactionId, expectedAmount]);

  if (!mounted || !open) return null;

  const handleFileChange = (file: File | null) => {
    if (file) {
      const mime = file.type?.toLowerCase();
      const name = file.name?.toLowerCase();
      const allowed =
        (mime && ALLOWED_PAYMENT_TYPES.includes(mime)) ||
        (!mime && PAYMENT_EXT_PATTERN.test(name || ''));
      if (!allowed) {
        setFileError('Unsupported file type. Please upload JPG, JPEG, PNG or PDF.');
        setResetTrigger((n) => n + 1);
        setProofFile(null);
        return;
      }
    }
    setFileError(null);
    setProofFile(file);
  };

  const parsedAmount = Number(String(amount).replace(/\s/g, '').replace(/,/g, ''));
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleSubmit = async () => {
    if (!proofFile || !transactionId.trim() || !amountValid) {
      setFormError('Please complete all required fields and upload a valid proof file.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({
        proofOfPayment: proofFile,
        transactionId: transactionId.trim(),
        amount: parsedAmount,
        notes: notes.trim() || undefined,
      });
      setProofFile(null);
      setNotes('');
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'We could not upload your payment proof. Please try again.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
        aria-label="Close payment proof dialog"
        onClick={onClose}
      />

      <div
        className="relative flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-proof-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Payment proof
            </p>
            <h3 id="payment-proof-modal-title" className="mt-1 text-lg font-semibold text-slate-900">
              Upload proof of payment
            </h3>
            <p className="mt-1 truncate text-sm text-slate-600">
              {applicationNumber} · {ownerSummary}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950">
            <p className="font-medium">Farmer share (60%)</p>
            <p className="mt-1 text-lg font-semibold">{formatRwfDisplay(expectedAmount)}</p>
            <p className="mt-2 text-xs text-emerald-800/90">
              Upload one receipt for the full application. Amount should match the farmer contribution.
            </p>
            {invoiceUrl && (
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-semibold text-emerald-800 underline-offset-2 hover:underline"
              >
                View invoice / quotation
              </a>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <Input
              name="transactionId"
              label="Transaction ID / reference (transactionId)"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. MOMO-20260515-12345"
              required
              disabled={submitting}
            />

            <Input
              name="amount"
              label="Amount paid in RWF (amount)"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Farmer contribution amount"
              required
              disabled={submitting}
            />

            <FileInput
              label="Payment proof file (proofOfPayment)"
              name="proofOfPayment"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileChange}
              error={fileError ?? undefined}
              resetTrigger={resetTrigger}
              currentFile={existingProofUrl?.split('/').pop()}
              documentUrl={existingProofUrl}
            />

            <div>
              <label
                htmlFor="payment-proof-notes"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Notes (notes) <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="payment-proof-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                rows={3}
                placeholder="Any extra context for finance review…"
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              />
            </div>
          </div>

          {formError && (
            <div
              className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
              <div>
                <p className="font-semibold text-red-950">Upload failed</p>
                <p className="mt-1 leading-relaxed text-red-800">{formError}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!proofFile || !transactionId.trim() || !amountValid || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit payment proof
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
