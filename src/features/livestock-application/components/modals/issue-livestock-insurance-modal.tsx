'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/file-input';

export interface IssueLivestockInsuranceFormPayload {
  insuranceCertificate: File;
  contract?: File;
  receipt?: File;
  ebm?: File;
  invoice?: File;
}

interface IssueLivestockInsuranceModalProps {
  open: boolean;
  onClose: () => void;
  applicationNumber: string;
  ownerSummary: string;
  onSubmit: (payload: IssueLivestockInsuranceFormPayload) => Promise<void>;
}

export function IssueLivestockInsuranceModal({
  open,
  onClose,
  applicationNumber,
  ownerSummary,
  onSubmit,
}: IssueLivestockInsuranceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [contract, setContract] = useState<File | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [ebm, setEbm] = useState<File | null>(null);
  const [invoice, setInvoice] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCertificate(null);
    setContract(null);
    setReceipt(null);
    setEbm(null);
    setInvoice(null);
    setError(null);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const handleSubmit = async () => {
    if (!certificate) {
      setError('Insurance certificate is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        insuranceCertificate: certificate,
        contract: contract ?? undefined,
        receipt: receipt ?? undefined,
        ebm: ebm ?? undefined,
        invoice: invoice ?? undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not issue insurance.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-blue-700">
              <ShieldCheck className="h-5 w-5" />
              <p className="text-sm font-semibold">Issue livestock insurance</p>
            </div>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{applicationNumber}</h3>
            <p className="text-sm text-slate-600">{ownerSummary}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            Payment is verified. Upload the policy contract and certificate so the veterinarian can
            proceed with nkunganire (if required) or SONARWA review.
          </p>

          <FileInput
            label="Insurance certificate (insuranceCertificate) *"
            name="insuranceCertificate"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={setCertificate}
          />
          <FileInput
            label="Contract (contract)"
            name="contract"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={setContract}
          />
          <FileInput
            label="Receipt (receipt)"
            name="receipt"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={setReceipt}
          />
          <FileInput label="EBM (ebm)" name="ebm" accept=".pdf,.jpg,.jpeg,.png" onChange={setEbm} />
          <FileInput
            label="Invoice (invoice)"
            name="invoice"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={setInvoice}
          />

          {error && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <Button type="button" variant="text" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!certificate || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Issuing…
              </>
            ) : (
              'Issue insurance'
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
