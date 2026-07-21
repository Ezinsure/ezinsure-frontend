'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { SubsidySignedUploadModal } from '@/features/livestock-application/components/modals/subsidy-signed-upload-modal';
import {
  generateSubsidyDocument,
} from '@/features/livestock-application/api/subsidy-api';
import { useUploadSignedSubsidyDocument } from '@/features/livestock-application/hooks/use-upload-signed-subsidy';
import { downloadNkunganireSubsidyExcel } from '@/features/livestock-application/export/subsidy-nkunganire-export';
import type {
  LivestockApplicationPackage,
  LivestockApplicationViewRole,
  UploadSignedSubsidyPayload,
} from '@/features/livestock-application/domain/application-types';
import { SUBSIDY_STATUS_LABELS } from '@/features/livestock-application/domain/application-status';
import { resolveSubsidyEligibility } from '@/features/livestock-application/utils/subsidy-eligibility';
import {
  canVetDownloadSubsidyDocument,
  canVetUploadSignedSubsidy,
} from '@/features/livestock-application/utils/workflow-rules';
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
  WorkflowSecondaryAction,
  WorkflowStepActions,
} from '@/features/livestock-application/components/workflow/workflow-step-actions';

interface SubsidyWorkflowSectionProps {
  application: LivestockApplicationPackage;
  viewRole?: LivestockApplicationViewRole;
  onUpdated?: () => void;
  onViewDocument?: (name: string, path: string) => void;
}

export function SubsidyWorkflowSection({
  application,
  viewRole = 'vet',
  onUpdated,
  onViewDocument,
}: SubsidyWorkflowSectionProps) {
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const toast = useWorkflowToast();
  const { upload: uploadSigned, isUploading } = useUploadSignedSubsidyDocument();
  const eligibility = resolveSubsidyEligibility(application);
  const { subsidyCase } = application;

  const insuranceIssued =
    showAllLivestockWorkflowActions() ||
    application.status === 'INSURANCE_ISSUED' ||
    Boolean(
      application.issuedDocuments?.contract,
    ) ||
    application.status.startsWith('SUBSIDY') ||
    ['PENDING_ADMIN_REVIEW', 'READY_TO_BE_PAID', 'PAID'].includes(application.status);

  if (!insuranceIssued) return null;

  const showSkipNotice = !eligibility.required && !showAllLivestockWorkflowActions();

  if (showSkipNotice) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
        <p className="text-sm font-medium text-emerald-900">Sector nkunganire not required</p>
        <p className="mt-2 text-sm text-emerald-800">{eligibility.reason}</p>
        <p className="mt-3 text-xs text-emerald-700">
          This application can proceed directly to SONARWA review after insurance is issued.
        </p>
      </section>
    );
  }

  const canDownload = resolveWorkflowActionVisible(
    viewRole === 'vet',
    canVetDownloadSubsidyDocument(application, viewRole),
  );
  const canUpload = resolveWorkflowActionVisible(
    viewRole === 'vet',
    canVetUploadSignedSubsidy(application, viewRole),
  );
  const hasGeneratedDoc = Boolean(subsidyCase.generatedDocumentUrl);
  const hasSignedUpload = Boolean(subsidyCase.uploadedSignedDocumentUrl);

  const downloadStepState = hasGeneratedDoc ? 'completed' : canDownload ? 'current' : 'upcoming';
  const uploadStepState = hasSignedUpload
    ? 'completed'
    : hasGeneratedDoc && canUpload
      ? 'current'
      : 'upcoming';

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateSubsidyDocument(application._id);
      toast.showSuccess(
        `Nkunganire template generated (${res.templateVersion}). Download the animal list and take it to the sector for signing.`,
      );
      onUpdated?.();
    } catch (err) {
      toast.showError(
        formatWorkflowActionError(
          err,
          'We could not generate the nkunganire template. Please try again.',
          'subsidy-upload',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadNkunganire = async () => {
    setDownloading(true);
    try {
      await downloadNkunganireSubsidyExcel(application);
      toast.showSuccess(
        'Nkunganire Excel downloaded with prefilled district, owners, and animal lines.',
      );
    } catch (err) {
      toast.showError(
        formatWorkflowActionError(
          err,
          'We could not download the nkunganire form. Please try again.',
          'subsidy-upload',
        ),
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleUploadSigned = async (payload: UploadSignedSubsidyPayload) => {
    try {
      await uploadSigned(application._id, payload);
      toast.showSuccess('Signed nkunganire uploaded. SONARWA will verify the document next.');
      onUpdated?.();
    } catch (err) {
      toast.showError(
        formatWorkflowActionError(
          err,
          'We could not upload the signed nkunganire document. Please check the file and try again.',
          'subsidy-upload',
        ),
      );
      throw err;
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-100 p-3">
            <FileSpreadsheet className="h-6 w-6 text-violet-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Nkunganire (40% subsidy)</h2>
            <p className="mt-1 text-sm text-slate-600">{eligibility.reason}</p>
            {!eligibility.required && showAllLivestockWorkflowActions() && (
              <p className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                Tekana-eligible — sector nkunganire is normally skipped, but actions remain available
                for testing.
              </p>
            )}
            <p className="mt-2 text-xs font-medium text-violet-800">
              Status: {SUBSIDY_STATUS_LABELS[subsidyCase.status]} ·{' '}
              {eligibility.animalsRequiringSector} of {eligibility.totalAnimals || eligibility.animalsRequiringSector}{' '}
              animal(s) need sector signature
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <WorkflowStepCard
            stepNumber={3}
            title="Download prefilled nkunganire Excel"
            description="Official MINAGRI template filled with district, sector, owners, premiums, and animal details."
            state={downloadStepState}
            badge={canDownload && !hasGeneratedDoc ? 'Action required' : undefined}
          >
            {viewRole === 'vet' && (
              <WorkflowStepActions>
                <WorkflowPrimaryAction
                  loading={downloading}
                  icon={<Download className="mr-2 h-4 w-4" />}
                  onClick={() => void handleDownloadNkunganire()}
                >
                  Download nkunganire form (Excel)
                </WorkflowPrimaryAction>
                <WorkflowSecondaryAction
                  loading={loading}
                  icon={<FileSpreadsheet className="mr-2 h-4 w-4" />}
                  onClick={() => void handleGenerate()}
                >
                  Generate nkunganire template
                </WorkflowSecondaryAction>
              </WorkflowStepActions>
            )}
            {subsidyCase.generatedDocumentUrl && onViewDocument && (
              <WorkflowStepActions className="mt-2.5">
                <WorkflowDocumentAction
                  label="View template"
                  onClick={() =>
                    onViewDocument('Nkunganire template', subsidyCase.generatedDocumentUrl!)
                  }
                />
              </WorkflowStepActions>
            )}
          </WorkflowStepCard>

          <WorkflowStepCard
            stepNumber={4}
            title="Upload sector-signed document"
            description="After the sector signs the nkunganire form, scan and upload it here for SONARWA verification."
            state={uploadStepState}
            badge={canUpload && !hasSignedUpload ? 'Action required' : undefined}
          >
            {viewRole === 'vet' && (
              <WorkflowStepActions>
                <WorkflowPrimaryAction
                  loading={isUploading}
                  icon={<Upload className="mr-2 h-4 w-4" />}
                  onClick={() => setUploadModalOpen(true)}
                >
                  Upload signed scan
                </WorkflowPrimaryAction>
              </WorkflowStepActions>
            )}
            {subsidyCase.uploadedSignedDocumentUrl && onViewDocument && (
              <WorkflowStepActions className={viewRole === 'vet' ? 'mt-2.5' : undefined}>
                <WorkflowDocumentAction
                  label="View signed document"
                  onClick={() =>
                    onViewDocument('Nkunganire (signed)', subsidyCase.uploadedSignedDocumentUrl!)
                  }
                />
              </WorkflowStepActions>
            )}
          </WorkflowStepCard>
        </div>
      </section>

      <SubsidySignedUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        applicationNumber={application.applicationNumber}
        existingDocumentUrl={subsidyCase.uploadedSignedDocumentUrl}
        onSubmit={handleUploadSigned}
      />
    </>
  );
}
