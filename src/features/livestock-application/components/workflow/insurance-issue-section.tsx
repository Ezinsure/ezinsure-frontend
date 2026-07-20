'use client';

import { useState } from 'react';
import { FileCheck2, ShieldCheck } from 'lucide-react';
import { useIssueLivestockInsurance } from '@/features/livestock-application/hooks/use-issue-livestock-insurance';
import { IssueLivestockInsuranceModal } from '@/features/livestock-application/components/modals/issue-livestock-insurance-modal';
import type {
  LivestockApplicationPackage,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import { canAdminIssueLivestockInsurance } from '@/features/livestock-application/utils/workflow-rules';
import { formatWorkflowActionError } from '@/features/livestock-application/utils/workflow-action-feedback';
import { resolveWorkflowActionVisible, showAllLivestockWorkflowActions } from '@/features/livestock-application/utils/workflow-demo-mode';
import { useWorkflowToast } from '@/features/livestock-application/components/workflow/workflow-toast-context';
import { WorkflowStepCard } from '@/features/livestock-application/components/workflow/workflow-step-card';
import {
  WorkflowDocumentAction,
  WorkflowPrimaryAction,
  WorkflowStepActions,
} from '@/features/livestock-application/components/workflow/workflow-step-actions';

interface InsuranceIssueSectionProps {
  application: LivestockApplicationPackage;
  viewRole?: LivestockApplicationViewRole;
  onUpdated?: () => void;
  onViewDocument?: (name: string, path: string) => void;
}

function hasIssuedPolicyDocuments(application: LivestockApplicationPackage): boolean {
  const docs = application.issuedDocuments;
  return Boolean(
    docs?.insuranceCertificate || docs?.contract || docs?.receipt || docs?.ebm || docs?.invoice,
  );
}

export function InsuranceIssueSection({
  application,
  viewRole = 'vet',
  onUpdated,
  onViewDocument,
}: InsuranceIssueSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useWorkflowToast();
  const { issue, isIssuing } = useIssueLivestockInsurance();

  const canIssue = resolveWorkflowActionVisible(
    viewRole === 'admin' || viewRole === 'super_admin',
    canAdminIssueLivestockInsurance(application, viewRole),
  );
  const isIssued =
    application.status === 'INSURANCE_ISSUED' || hasIssuedPolicyDocuments(application);
  const showSection =
    showAllLivestockWorkflowActions() ||
    application.status === 'PAYMENT_VERIFIED' ||
    isIssued ||
    application.paymentProof.status === 'VERIFIED';

  if (!showSection) return null;

  const stepState = isIssued ? 'completed' : canIssue ? 'current' : 'upcoming';

  const handleIssue = async (payload: Parameters<typeof issue>[1]) => {
    try {
      await issue(application._id, payload);
      toast.showSuccess(
        'Insurance issued. The veterinarian can now complete nkunganire (if required) or proceed to SONARWA review.',
      );
      onUpdated?.();
    } catch (err) {
      toast.showError(
        formatWorkflowActionError(
          err,
          'We could not issue insurance. Please check the certificate file and try again.',
          'issue-insurance',
        ),
      );
      throw err;
    }
  };

  const docs = application.issuedDocuments;

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-3">
            <ShieldCheck className="h-6 w-6 text-blue-700" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">Issue insurance</h2>
            <p className="mt-1 text-sm text-slate-600">
              After payment is verified, upload the insurance certificate and optional policy documents
              to activate the policy.
              {(viewRole === 'admin' || viewRole === 'super_admin') &&
                ' This unlocks the nkunganire and SONARWA workflow for the vet.'}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <WorkflowStepCard
            stepNumber={2}
            title={isIssued ? 'Policy documents issued' : 'Upload insurance documents'}
            description={
              isIssued
                ? 'Policy documents are on file. The application can proceed to subsidy or SONARWA review.'
                : 'Insurance certificate is required. Contract, receipt, EBM, and invoice are optional.'
            }
            state={stepState}
            badge={isIssued ? 'Completed' : canIssue ? 'Action required' : undefined}
          >
            <WorkflowStepActions>
              {canIssue && !isIssued && (
                <WorkflowPrimaryAction
                  loading={isIssuing}
                  icon={<FileCheck2 className="mr-2 h-4 w-4" />}
                  onClick={() => setModalOpen(true)}
                >
                  Issue insurance
                </WorkflowPrimaryAction>
              )}

              {isIssued && docs && onViewDocument && (
                <>
                  {docs.insuranceCertificate && (
                    <WorkflowDocumentAction
                      label="Insurance certificate"
                      onClick={() =>
                        onViewDocument('Insurance certificate', docs.insuranceCertificate!)
                      }
                    />
                  )}
                  {docs.contract && (
                    <WorkflowDocumentAction
                      label="Contract"
                      onClick={() => onViewDocument('Contract', docs.contract!)}
                    />
                  )}
                  {docs.receipt && (
                    <WorkflowDocumentAction
                      label="Receipt"
                      onClick={() => onViewDocument('Receipt', docs.receipt!)}
                    />
                  )}
                  {docs.ebm && (
                    <WorkflowDocumentAction
                      label="EBM"
                      onClick={() => onViewDocument('EBM', docs.ebm!)}
                    />
                  )}
                  {docs.invoice && (
                    <WorkflowDocumentAction
                      label="Invoice"
                      onClick={() => onViewDocument('Invoice', docs.invoice!)}
                    />
                  )}
                </>
              )}
            </WorkflowStepActions>
          </WorkflowStepCard>
        </div>
      </section>

      <IssueLivestockInsuranceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        applicationNumber={application.applicationNumber}
        ownerSummary={application.ownerSummary}
        onSubmit={handleIssue}
      />
    </>
  );
}
