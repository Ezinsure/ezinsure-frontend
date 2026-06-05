'use client';

import { useState } from 'react';
import { Eye, FileUp, Loader2, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentProofUploadModal } from '@/features/livestock-application/components/modals/payment-proof-upload-modal';
import { ApiContractPanel } from '@/features/livestock-application/components/shared/api-contract-panel';
import { uploadPaymentProof } from '@/features/livestock-application/api/applications-api';
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
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const { paymentProof } = application;

  const canUpload =
    viewRole === 'vet' && (paymentProof.status === 'PENDING' || paymentProof.status === 'REJECTED');

  const handleSubmit = async (payload: { proofOfPayment: File; transactionId: string }) => {
    setLoading(true);
    setNote(null);
    try {
      await uploadPaymentProof(application._id, {
        amount: paymentProof.expectedAmount,
        proofOfPayment: payload.proofOfPayment,
        transactionId: payload.transactionId,
      });
      setNote('Payment proof submitted successfully.');
      onUpdated?.();
    } finally {
      setLoading(false);
    }
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
              <dd className="mt-1 text-sm font-mono font-semibold text-slate-800">
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
            <Button type="button" variant="primary" disabled={loading} onClick={() => setModalOpen(true)}>
              {loading ? (
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

        {note && (
          <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {note}
          </p>
        )}

        <ApiContractPanel contractKey="uploadPaymentProof" className="mt-6" />
      </section>

      <PaymentProofUploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        ownerSummary={application.ownerSummary}
        expectedAmount={paymentProof.expectedAmount}
        invoiceUrl={application.issuedDocuments?.invoice}
        existingProofUrl={paymentProof.documentUrl}
        existingTransactionId={paymentProof.transactionId}
        onSubmit={handleSubmit}
      />
    </>
  );
}
