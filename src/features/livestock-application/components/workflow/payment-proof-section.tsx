'use client';

import { useState } from 'react';
import { FileUp, Receipt, ShieldCheck } from 'lucide-react';
import {
  PaymentProofUploadModal,
  type PaymentProofUploadPayload,
} from '@/features/livestock-application/components/modals/payment-proof-upload-modal';
import { PaymentProofReviewModal } from '@/features/livestock-application/components/modals/payment-proof-review-modal';
import { useUploadLivestockPaymentProof } from '@/features/livestock-application/hooks/use-upload-payment-proof';
import { useVerifyLivestockPaymentProof } from '@/features/livestock-application/hooks/use-verify-livestock-payment';
import type {
  LivestockApplicationPackage,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import { canAdminReviewLivestockPayment } from '@/features/livestock-application/utils/application-timeline';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { formatWorkflowActionError } from '@/features/livestock-application/utils/workflow-action-feedback';
import { resolveWorkflowActionVisible } from '@/features/livestock-application/utils/workflow-demo-mode';
import { useWorkflowToast } from '@/features/livestock-application/components/workflow/workflow-toast-context';
import {
  WorkflowDocumentAction,
  WorkflowPrimaryAction,
  WorkflowStepActions,
} from '@/features/livestock-application/components/workflow/workflow-step-actions';

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
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const toast = useWorkflowToast();
  const { upload, isUploading } = useUploadLivestockPaymentProof();
  const { verify, isVerifying } = useVerifyLivestockPaymentProof();
  const { paymentProof } = application;

  const canUpload = resolveWorkflowActionVisible(
    viewRole === 'vet',
    paymentProof.status === 'PENDING' || paymentProof.status === 'REJECTED',
  );

  const canReview = resolveWorkflowActionVisible(
    viewRole === 'admin' || viewRole === 'super_admin',
    canAdminReviewLivestockPayment(application),
  );

  const handleUploadSubmit = async (payload: PaymentProofUploadPayload) => {
    try {
      await upload(application._id, {
        amount: payload.amount,
        proofOfPayment: payload.proofOfPayment,
        transactionId: payload.transactionId,
        notes: payload.notes,
      });
      toast.showSuccess(
        'Payment proof submitted successfully. An administrator will review the receipt.',
      );
      onUpdated?.();
    } catch (err) {
      toast.showError(
        formatWorkflowActionError(
          err,
          'We could not upload your payment proof. Please try again.',
          'payment-proof',
        ),
      );
      throw err;
    }
  };

  const handleReviewSubmit = async (payload: {
    action: 'approve' | 'reject';
    reasonForPaymentRejection?: string;
  }) => {
    try {
      await verify(application._id, payload);
      toast.showSuccess(
        payload.action === 'approve'
          ? 'Payment verified. The application can proceed to the next workflow step.'
          : 'Payment rejected and sent back to the veterinarian with your feedback.',
      );
      onUpdated?.();
    } catch (err) {
      toast.showError(
        formatWorkflowActionError(
          err,
          'We could not complete the payment review. Please try again.',
          'payment-proof',
        ),
      );
      throw err;
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
              {viewRole === 'vet' && ' Upload the farmer receipt once payment is complete.'}
              {viewRole === 'admin' && ' Review the uploaded proof and approve or reject it.'}
              {viewRole === 'super_admin' && ' Review the uploaded proof and approve or reject it.'}
              {viewRole !== 'vet' && viewRole !== 'admin' && viewRole !== 'super_admin' &&
                ' Track payment proof status here.'}
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

        <WorkflowStepActions className="mt-6">
          {canUpload && (
            <WorkflowPrimaryAction
              loading={isUploading}
              icon={<FileUp className="mr-2 h-4 w-4" />}
              onClick={() => setUploadModalOpen(true)}
            >
              Upload payment proof
            </WorkflowPrimaryAction>
          )}

          {canReview && (
            <WorkflowPrimaryAction
              loading={isVerifying}
              icon={<ShieldCheck className="mr-2 h-4 w-4" />}
              onClick={() => setReviewModalOpen(true)}
            >
              Review payment
            </WorkflowPrimaryAction>
          )}

          {paymentProof.documentUrl && onViewDocument && (
            <WorkflowDocumentAction
              label="View payment proof"
              onClick={() => onViewDocument('Payment proof', paymentProof.documentUrl!)}
            />
          )}
        </WorkflowStepActions>
      </section>

      {canUpload && (
        <PaymentProofUploadModal
          open={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          applicationNumber={application.applicationNumber}
          ownerSummary={application.ownerSummary}
          expectedAmount={paymentProof.expectedAmount}
          invoiceUrl={application.issuedDocuments?.invoice}
          existingProofUrl={paymentProof.documentUrl}
          existingTransactionId={paymentProof.transactionId}
          onSubmit={handleUploadSubmit}
        />
      )}

      {canReview && (
        <PaymentProofReviewModal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          applicationNumber={application.applicationNumber}
          ownerSummary={application.ownerSummary}
          expectedAmount={paymentProof.expectedAmount}
          transactionId={paymentProof.transactionId}
          proofUrl={paymentProof.documentUrl}
          submittedAt={paymentProof.submittedAt ?? application.updatedAt}
          onSubmit={handleReviewSubmit}
          onViewDocument={onViewDocument}
        />
      )}
    </>
  );
}
