'use client';

import { useState } from 'react';
import { Banknote, CheckCircle2, Wallet } from 'lucide-react';
import {
  approveLivestockCommission,
  markLivestockCommissionPaid,
} from '@/features/livestock-application/api/commission-workflow-api';
import type {
  LivestockApplicationPackage,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import {
  canManageCommissionWorkflow,
  canMarkCommissionPaid,
  canMarkReadyToBePaid,
} from '@/features/livestock-application/utils/workflow-rules';
import {
  resolveWorkflowActionVisible,
  showAllLivestockWorkflowActions,
} from '@/features/livestock-application/utils/workflow-demo-mode';
import { WorkflowStepCard } from '@/features/livestock-application/components/workflow/workflow-step-card';
import { WorkflowPrimaryAction, WorkflowStepActions } from '@/features/livestock-application/components/workflow/workflow-step-actions';
import { useApiClient } from '@/utils/apiClient';

interface CommissionWorkflowSectionProps {
  application: LivestockApplicationPackage;
  viewRole?: LivestockApplicationViewRole;
  onUpdated?: () => void;
}

export function CommissionWorkflowSection({
  application,
  viewRole = 'vet',
  onUpdated,
}: CommissionWorkflowSectionProps) {
  const [loading, setLoading] = useState<'approve' | 'paid' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const { apiFetch } = useApiClient();

  const showSection =
    showAllLivestockWorkflowActions() ||
    application.status === 'PENDING_COMMISSION_REVIEW' ||
    application.status === 'READY_TO_BE_PAID' ||
    application.status === 'PAID' ||
    application.status === 'COMMISSION_APPROVED' ||
    application.subsidyCase.status === 'SONARWA_APPROVED';

  if (!showSection) return null;

  const isPaid = application.status === 'PAID';
  const isReady = application.status === 'READY_TO_BE_PAID';
  const isPendingReview = application.status === 'PENDING_COMMISSION_REVIEW';

  const canApprove = resolveWorkflowActionVisible(
    viewRole === 'admin' || viewRole === 'finance',
    canMarkReadyToBePaid(application, viewRole),
  );
  const canPay = resolveWorkflowActionVisible(
    viewRole === 'admin' || viewRole === 'finance',
    canMarkCommissionPaid(application, viewRole),
  );
  const isFinanceView = canManageCommissionWorkflow(application, viewRole) || canPay;

  const handleApproveCommission = async () => {
    setLoading('approve');
    setNote(null);
    try {
      await approveLivestockCommission(apiFetch, application._id, {
        notes: approvalNotes.trim() || undefined,
      });
      setNote('Commission approved. Application is ready to be paid.');
      onUpdated?.();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not approve commission.');
    } finally {
      setLoading(null);
    }
  };

  const handleMarkPaid = async () => {
    setLoading('paid');
    setNote(null);
    try {
      await markLivestockCommissionPaid(apiFetch, application._id, {
        paymentReference: paymentReference.trim() || undefined,
      });
      setNote('Veterinary commission marked as paid.');
      onUpdated?.();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not mark as paid.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50/50 to-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-orange-100 p-3">
          <Wallet className="h-6 w-6 text-orange-800" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900">Commission & payment</h2>
          <p className="mt-1 text-sm text-slate-600">
            After SONARWA approval, finance reviews the veterinary commission, marks the application
            ready to pay, then records payment.
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            Vet commission: {formatRwfDisplay(application.totals.veterinaryCommission)}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <WorkflowStepCard
          stepNumber={5}
          title="Commission review"
          description={
            isPendingReview
              ? 'Finance verifies commission amounts before releasing payment.'
              : isReady || isPaid
                ? 'Commission review completed.'
                : 'Waiting for SONARWA approval.'
          }
          state={isPendingReview ? 'current' : isReady || isPaid ? 'completed' : 'upcoming'}
          badge={isPendingReview && canApprove ? 'Action required' : undefined}
        >
          {canApprove && (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="commission-approval-notes"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Notes <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="commission-approval-notes"
                  rows={2}
                  value={approvalNotes}
                  onChange={(event) => setApprovalNotes(event.target.value)}
                  disabled={loading !== null}
                  placeholder="Finance review notes sent to the API as notes…"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                />
              </div>
              <WorkflowStepActions>
                <WorkflowPrimaryAction
                  loading={loading === 'approve'}
                  icon={<CheckCircle2 className="mr-2 h-4 w-4" />}
                  onClick={() => void handleApproveCommission()}
                >
                  Approve & mark ready to pay
                </WorkflowPrimaryAction>
              </WorkflowStepActions>
            </div>
          )}
        </WorkflowStepCard>

        <WorkflowStepCard
          stepNumber={6}
          title={isPaid ? 'Commission paid' : 'Ready to be paid'}
          description={
            isPaid
              ? 'Veterinary commission has been disbursed.'
              : isReady
                ? 'Commission is approved — record payment when the transfer is complete.'
                : 'Available after commission review is approved.'
          }
          state={isPaid ? 'completed' : isReady ? 'current' : 'upcoming'}
          badge={isReady && canPay ? 'Action required' : isPaid ? 'Completed' : undefined}
        >
          {canPay && (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="commission-payment-reference"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Payment reference <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="commission-payment-reference"
                  type="text"
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  disabled={loading !== null}
                  placeholder="Bank transfer or MoMo reference"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                />
              </div>
              <WorkflowStepActions>
                <WorkflowPrimaryAction
                  loading={loading === 'paid'}
                  icon={<Banknote className="mr-2 h-4 w-4" />}
                  onClick={() => void handleMarkPaid()}
                >
                  Mark commission as paid
                </WorkflowPrimaryAction>
              </WorkflowStepActions>
            </div>
          )}
        </WorkflowStepCard>
      </div>

      {!isFinanceView && viewRole === 'vet' && (
        <p className="mt-4 text-xs text-slate-500">
          Finance will process your commission after SONARWA approval. You will see status updates here.
        </p>
      )}

      {note && (
        <p className="mt-4 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm text-orange-900">
          {note}
        </p>
      )}
    </section>
  );
}
