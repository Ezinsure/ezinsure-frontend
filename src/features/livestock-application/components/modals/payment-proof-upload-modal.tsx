'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/file-input';
import { Input } from '@/components/ui/input';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';

const ALLOWED_PAYMENT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const PAYMENT_EXT_PATTERN = /\.(jpe?g|png|pdf)$/i;

interface PaymentProofUploadModalProps {
  open: boolean;
  onClose: () => void;
  ownerSummary: string;
  expectedAmount: number;
  invoiceUrl?: string;
  existingProofUrl?: string;
  existingTransactionId?: string;
  onSubmit: (payload: { proofOfPayment: File; transactionId: string }) => Promise<void>;
}

export function PaymentProofUploadModal({
  open,
  onClose,
  ownerSummary,
  expectedAmount,
  invoiceUrl,
  existingProofUrl,
  existingTransactionId,
  onSubmit,
}: PaymentProofUploadModalProps) {
  const [transactionId, setTransactionId] = useState(existingTransactionId ?? '');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

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

  const handleSubmit = async () => {
    if (!proofFile || !transactionId.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ proofOfPayment: proofFile, transactionId: transactionId.trim() });
      setProofFile(null);
      setTransactionId('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-labelledby="payment-proof-modal-title"
      >
        <h3 id="payment-proof-modal-title" className="text-lg font-semibold text-slate-900">
          Upload payment proof
        </h3>
        <p className="mt-1 text-sm text-slate-600">{ownerSummary}</p>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-medium text-slate-800">Payment summary</p>
            <p className="mt-2">
              <span className="text-slate-500">Farmer share (60%):</span>{' '}
              <span className="font-semibold text-emerald-700">{formatRwfDisplay(expectedAmount)}</span>
            </p>
            {invoiceUrl && (
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline"
              >
                View invoice / quotation
              </a>
            )}
          </div>

          <Input
            name="transactionId"
            label="Transaction ID / reference *"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="e.g. MOMO-20260515-12345"
            required
          />

          <FileInput
            label="Payment proof *"
            name="proofOfPayment"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileChange}
            error={fileError ?? undefined}
            resetTrigger={resetTrigger}
            currentFile={existingProofUrl?.split('/').pop()}
            documentUrl={existingProofUrl}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="text" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!proofFile || !transactionId.trim() || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              'Submit payment proof'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
