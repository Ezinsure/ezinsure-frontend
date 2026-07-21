'use client';

import { useState } from 'react';
import { CheckCircle2, Stamp } from 'lucide-react';
import { useReviewSonarwaSubsidy } from '@/features/livestock-application/hooks/use-review-sonarwa-subsidy';
import { SonarwaSubsidyReviewModal } from '@/features/livestock-application/components/modals/sonarwa-subsidy-review-modal';
import type {
  LivestockApplicationPackage,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import { resolveSubsidyEligibility } from '@/features/livestock-application/utils/subsidy-eligibility';
import { canAdminReviewSonarwaSubsidy } from '@/features/livestock-application/utils/workflow-rules';
import { formatWorkflowActionError } from '@/features/livestock-application/utils/workflow-action-feedback';
import {
  resolveWorkflowActionVisible,
  showAllLivestockWorkflowActions,
} from '@/features/livestock-application/utils/workflow-demo-mode';
import { useWorkflowToast } from '@/features/livestock-application/components/workflow/workflow-toast-context';
import { WorkflowStepCard } from '@/features/livestock-application/components/workflow/workflow-step-card';
import {
  WorkflowDocumentAction,
  WorkflowPrimaryAction,
  WorkflowStepActions,
} from '@/features/livestock-application/components/workflow/workflow-step-actions';

interface SonarwaReviewSectionProps {
  application: LivestockApplicationPackage;
  viewRole?: LivestockApplicationViewRole;
  onUpdated?: () => void;
  onViewDocument?: (name: string, path: string) => void;
}

export function SonarwaReviewSection({
  application,
  viewRole = 'vet',
  onUpdated,
  onViewDocument,
}: SonarwaReviewSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useWorkflowToast();
  const { review, isReviewing } = useReviewSonarwaSubsidy();

  const eligibility = resolveSubsidyEligibility(application);
  const isApproved =
    application.subsidyCase.status === 'SONARWA_APPROVED' ||
    application.status === 'PENDING_ADMIN_REVIEW' ||
    application.status === 'READY_TO_BE_PAID' ||
    application.status === 'PAID';
  const canReview = resolveWorkflowActionVisible(
    viewRole === 'admin' || viewRole === 'super_admin',
    canAdminReviewSonarwaSubsidy(application, viewRole) && !isApproved,
  );
  const isRejected = application.subsidyCase.status === 'REJECTED';

  const insuranceIssued =
    showAllLivestockWorkflowActions() ||
    application.status === 'INSURANCE_ISSUED' ||
    Boolean(
      application.issuedDocuments?.contract,
    ) ||
    [
      'SUBSIDY_DOC_REQUIRED',
      'SUBSIDY_SECTOR_PENDING',
      'SUBSIDY_SECTOR_SIGNED',
      'SUBSIDY_VET_SIGNED',
      'SUBSIDY_SONARWA_APPROVED',
      'PENDING_ADMIN_REVIEW',
      'READY_TO_BE_PAID',
      'PAID',
    ].includes(application.status);

  if (!insuranceIssued) return null;

  const stepState = isApproved
    ? 'completed'
    : isRejected
      ? 'current'
      : canReview
        ? 'current'
        : 'upcoming';

  const handleReview = async (payload: Parameters<typeof review>[1]) => {
    try {
      await review(application._id, payload);
      toast.showSuccess(
        payload.action === 'approve'
          ? 'SONARWA approved. Application moved to pending admin review.'
          : 'SONARWA rejected the nkunganire document. The veterinarian must re-upload a corrected scan.',
      );
      onUpdated?.();
    } catch (err) {
      toast.showError(
        formatWorkflowActionError(
          err,
          'We could not complete the SONARWA review. Please try again.',
          'sonarwa-review',
        ),
      );
      throw err;
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/60 to-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-teal-100 p-3">
            <Stamp className="h-6 w-6 text-teal-800" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">SONARWA review</h2>
            <p className="mt-1 text-sm text-slate-600">
              SONARWA representative verifies the nkunganire document (or Tekana-eligible skip) before
              admin review.
              {(viewRole === 'admin' || viewRole === 'super_admin') &&
                ' Until the SONARWA portal is available, administrators act on behalf of SONARWA here.'}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <WorkflowStepCard
            stepNumber={eligibility.required ? 4 : 3}
            title={
              isApproved
                ? 'SONARWA approved'
                : isRejected
                  ? 'SONARWA rejected — corrections needed'
                  : 'Awaiting SONARWA verification'
            }
            description={
              isApproved
                ? `Approved ${application.subsidyCase.sonarwaApprovedAt ? new Date(application.subsidyCase.sonarwaApprovedAt).toLocaleString() : ''}. Ready for admin review.`
                : eligibility.required
                  ? 'Review the sector-signed nkunganire scan uploaded by the veterinarian.'
                  : eligibility.reason
            }
            state={stepState}
            badge={
              isApproved ? 'Completed' : canReview ? 'Action required' : isRejected ? 'Rejected' : undefined
            }
          >
            <WorkflowStepActions>
              {canReview && (viewRole === 'admin' || viewRole === 'super_admin') && (
                <WorkflowPrimaryAction
                  loading={isReviewing}
                  icon={<CheckCircle2 className="mr-2 h-4 w-4" />}
                  onClick={() => setModalOpen(true)}
                >
                  Review & approve
                </WorkflowPrimaryAction>
              )}

              {application.subsidyCase.uploadedSignedDocumentUrl && onViewDocument && (
                <WorkflowDocumentAction
                  label="View signed nkunganire"
                  onClick={() =>
                    onViewDocument(
                      'Nkunganire (signed)',
                      application.subsidyCase.uploadedSignedDocumentUrl!,
                    )
                  }
                />
              )}
            </WorkflowStepActions>

            {isRejected && application.subsidyCase.sonarwaRejectionReason && (
              <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
                {application.subsidyCase.sonarwaRejectionReason}
              </p>
            )}
          </WorkflowStepCard>
        </div>
      </section>

      <SonarwaSubsidyReviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        applicationNumber={application.applicationNumber}
        ownerSummary={application.ownerSummary}
        signedDocumentUrl={application.subsidyCase.uploadedSignedDocumentUrl}
        skipSectorReason={!eligibility.required ? eligibility.reason : undefined}
        onSubmit={handleReview}
        onViewDocument={onViewDocument}
      />
    </>
  );
}
