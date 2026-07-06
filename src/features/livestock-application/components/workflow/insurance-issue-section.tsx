'use client';

import { useState } from 'react';
import { FileCheck2, ShieldCheck } from 'lucide-react';
import { issueLivestockInsurance } from '@/features/livestock-application/api/insurance-issue-api';
import { IssueLivestockInsuranceModal } from '@/features/livestock-application/components/modals/issue-livestock-insurance-modal';
import type {
  LivestockApplicationPackage,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import { canAdminIssueLivestockInsurance } from '@/features/livestock-application/utils/workflow-rules';
import { resolveWorkflowActionVisible, showAllLivestockWorkflowActions } from '@/features/livestock-application/utils/workflow-demo-mode';
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

export function InsuranceIssueSection({
  application,
  viewRole = 'vet',
  onUpdated,
  onViewDocument,
}: InsuranceIssueSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const canIssue = resolveWorkflowActionVisible(
    viewRole === 'admin',
    canAdminIssueLivestockInsurance(application, viewRole),
  );
  const isIssued =
    application.status === 'INSURANCE_ISSUED' ||
    Boolean(application.issuedDocuments?.insuranceCertificate);
  const showSection =
    showAllLivestockWorkflowActions() ||
    application.status === 'PAYMENT_VERIFIED' ||
    isIssued ||
    application.paymentProof.status === 'VERIFIED';

  if (!showSection) return null;

  const stepState = isIssued ? 'completed' : canIssue ? 'current' : 'upcoming';

  const handleIssue = async (payload: Parameters<typeof issueLivestockInsurance>[1]) => {
    setLoading(true);
    setNote(null);
    try {
      await issueLivestockInsurance(application._id, payload);
      setModalOpen(false);
      setNote('Insurance issued. The veterinarian can now complete nkunganire (if required) or proceed to SONARWA review.');
      onUpdated?.();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not issue insurance.');
    } finally {
      setLoading(false);
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
              After payment is verified, upload the contract and certificate to activate the policy.
              {viewRole === 'admin' && ' This unlocks the nkunganire and SONARWA workflow for the vet.'}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <WorkflowStepCard
            stepNumber={2}
            title={isIssued ? 'Policy documents issued' : 'Upload contract & certificate'}
            description={
              isIssued
                ? 'Policy documents are on file. The application can proceed to subsidy or SONARWA review.'
                : 'Insurance certificate is required. Contract, receipt, and EBM are optional.'
            }
            state={stepState}
            badge={isIssued ? 'Completed' : canIssue ? 'Action required' : undefined}
          >
            <WorkflowStepActions>
              {canIssue && !isIssued && (
                <WorkflowPrimaryAction
                  loading={loading}
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
                      label="Certificate"
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
                </>
              )}
            </WorkflowStepActions>
          </WorkflowStepCard>
        </div>

        {note && (
          <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            {note}
          </p>
        )}
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
