'use client';

import { useState } from 'react';
import { AlertCircle, Eye, FileUp, Loader2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PaymentProofUploadModal,
  type PaymentProofUploadPayload,
} from '@/features/livestock-application/components/modals/payment-proof-upload-modal';
import { ApiContractPanel } from '@/features/livestock-application/components/shared/api-contract-panel';
import { useUploadLivestockPaymentProof } from '@/features/livestock-application/hooks/use-upload-payment-proof';
import type {
  LivestockApplicationPackage,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';

interface PaymentProofSectionProps {
  application: LivestockApplicationPackage;
  viewRole?: LivestockApplicationViewRole;
  onUpdated?: () => void;
  onViewDocument?: (name: string, path: string) => void;
}

export function PaymentProofSection({
  application,
  viewRole = 'vet',
  onUpdated,
  onViewDocument,
}: PaymentProofSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const { upload, isUploading, error: uploadError, clearError } = useUploadLivestockPaymentProof();
  const { paymentProof } = application;

  const canUpload =
    viewRole === 'vet' && (paymentProof.status === 'PENDING' || paymentProof.status === 'REJECTED');

  const handleSubmit = async (payload: PaymentProofUploadPayload) => {
    setNote(null);
    clearError();
    await upload(application._id, {
      amount: payload.amount,
      proofOfPayment: payload.proofOfPayment,
      transactionId: payload.transactionId,
      notes: payload.notes,
    });
    setNote('Payment proof submitted successfully. Finance will review the receipt.');
    onUpdated?.();
  };

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-50 p-3">
            <Receipt className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">Payment proof</h2>
            <p className="mt-1 text-sm text-slate-600">
              One receipt for the whole application — farmer share (60%) for all animals combined.
              {viewRole !== 'vet' && ' Only veterinarians can upload payment proof.'}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase text-slate-500">Expected amount</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">
              {formatRwfDisplay(paymentProof.expectedAmount)}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase text-slate-500">Status</dt>
            <dd className="mt-1 text-sm font-semibold capitalize text-slate-800">
              {paymentProof.status.replace(/_/g, ' ').toLowerCase()}
            </dd>
          </div>
          {paymentProof.transactionId && (
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs font-medium uppercase text-slate-500">Transaction ID</dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-slate-800">
                {paymentProof.transactionId}
              </dd>
            </div>
          )}
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase text-slate-500">Document</dt>
            <dd className="mt-1 text-sm text-slate-700">
              {paymentProof.documentUrl ? 'Uploaded' : 'Not uploaded'}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          {canUpload && (
            <Button
              type="button"
              variant="primary"
              disabled={isUploading}
              onClick={() => setModalOpen(true)}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="mr-2 h-4 w-4" />
              )}
              Upload payment proof
            </Button>
          )}
          {paymentProof.documentUrl && onViewDocument && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onViewDocument('Payment proof', paymentProof.documentUrl!)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View payment proof
            </Button>
          )}
        </div>

        {uploadError && (
          <div
            className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
            <div>
              <p className="font-semibold text-red-950">Could not upload payment proof</p>
              <p className="mt-1 leading-relaxed text-red-800">{uploadError}</p>
            </div>
          </div>
        )}

        {note && (
          <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {note}
          </p>
        )}

        {viewRole === 'vet' && (
          <ApiContractPanel contractKey="uploadPaymentProof" className="mt-6" />
        )}
      </section>

      {canUpload && (
        <PaymentProofUploadModal
          open={modalOpen}
          onClose={() => {
            clearError();
            setModalOpen(false);
          }}
          applicationNumber={application.applicationNumber}
          ownerSummary={application.ownerSummary}
          expectedAmount={paymentProof.expectedAmount}
          invoiceUrl={application.issuedDocuments?.invoice}
          existingProofUrl={paymentProof.documentUrl}
          existingTransactionId={paymentProof.transactionId}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
