'use client';

import { useState } from 'react';
import { Download, Eye, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SubsidySignedUploadModal } from '@/features/livestock-application/components/modals/subsidy-signed-upload-modal';
import { ApiContractPanel } from '@/features/livestock-application/components/shared/api-contract-panel';
import { ComingSoonButton } from '@/features/livestock-application/components/shared/coming-soon-button';
import {
  generateSubsidyDocument,
  uploadSignedSubsidyDocument,
} from '@/features/livestock-application/api/applications-api';
import type {
  LivestockApplicationPackage,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import { SUBSIDY_STATUS_LABELS } from '@/features/livestock-application/domain/application-status';

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
  const [loading, setLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const { subsidyCase } = application;

  if (!subsidyCase.required) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
        <p className="text-sm font-medium text-emerald-800">
          Nkunganire sector document not required — all animals Tekana-eligible or product exempt.
        </p>
      </section>
    );
  }

  const canUploadSigned = viewRole === 'vet';

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await generateSubsidyDocument(application._id);
      setNote(`Document generated: ${res.templateVersion}`);
      onUpdated?.();
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSigned = async (payload: {
    signedDocument: File;
    signedBy: 'SECTOR';
  }) => {
    setLoading(true);
    try {
      await uploadSignedSubsidyDocument(application._id, payload);
      setNote('Signed document uploaded. Forward to SONARWA for approval.');
      onUpdated?.();
    } finally {
      setLoading(false);
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
            <p className="mt-1 text-sm text-slate-600">
              Generate the sector Excel template, collect signatures, then upload the scanned copy.
            </p>
            <p className="mt-2 text-xs font-medium text-violet-800">
              Status: {SUBSIDY_STATUS_LABELS[subsidyCase.status]}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {canUploadSigned && (
            <>
              <Button type="button" variant="primary" disabled={loading} onClick={() => void handleGenerate()}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Generate nkunganire document
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => setUploadModalOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload signed scan
              </Button>
              <ComingSoonButton tooltip="Digital signing by sector official, vet, and SONARWA — coming soon">
                Sign in app
              </ComingSoonButton>
            </>
          )}
          {subsidyCase.generatedDocumentUrl && onViewDocument && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onViewDocument('Nkunganire template', subsidyCase.generatedDocumentUrl!)
              }
            >
              <Eye className="mr-2 h-4 w-4" />
              View template
            </Button>
          )}
          {subsidyCase.uploadedSignedDocumentUrl && onViewDocument && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onViewDocument('Nkunganire (signed)', subsidyCase.uploadedSignedDocumentUrl!)
              }
            >
              <Eye className="mr-2 h-4 w-4" />
              View signed document
            </Button>
          )}
        </div>

        {note && (
          <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            {note}
          </p>
        )}

        <ApiContractPanel contractKey="generateSubsidyDoc" className="mt-6" />
        <ApiContractPanel contractKey="uploadSignedSubsidy" className="mt-3" />
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
