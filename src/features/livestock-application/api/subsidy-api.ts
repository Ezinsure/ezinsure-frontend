import type {
  GenerateSubsidyDocumentResponse,
  UploadSignedSubsidyPayload,
} from '@/features/livestock-application/domain/application-types';
import { LIVESTOCK_SUBSIDY_ENDPOINTS } from '@/features/livestock-application/api/endpoints';
import {
  mapSubsidyStatusToApplicationStatus,
  patchLivestockWorkflowState,
} from '@/features/livestock-application/api/workflow-session';

function simulateDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 350));
}

function fileToObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Generate the nkunganire subsidy document for an application.
 * Backend: POST `LIVESTOCK_SUBSIDY_ENDPOINTS.generateDocument(id)`.
 */
export async function generateSubsidyDocument(
  applicationId: string,
): Promise<GenerateSubsidyDocumentResponse> {
  void LIVESTOCK_SUBSIDY_ENDPOINTS.generateDocument(applicationId);
  await simulateDelay();

  const documentUrl = `https://placeholder.ezinsure.local/subsidy/${applicationId}/nkunganire-v1.xlsx`;
  const templateVersion = 'nkunganire-2026-v1';

  patchLivestockWorkflowState(applicationId, {
    status: 'SUBSIDY_DOC_REQUIRED',
    subsidyStatus: 'DOC_GENERATED',
    subsidyRequired: true,
    subsidyCase: {
      status: 'DOC_GENERATED',
      generatedDocumentUrl: documentUrl,
    },
  });

  return { documentUrl, templateVersion };
}

/**
 * Upload a sector-signed nkunganire document.
 * Backend: PUT multipart `LIVESTOCK_SUBSIDY_ENDPOINTS.uploadSignedDocument(id)`.
 */
export async function uploadSignedSubsidyDocument(
  applicationId: string,
  payload: UploadSignedSubsidyPayload,
): Promise<{ subsidyCase: { status: string; uploadedSignedDocumentUrl: string } }> {
  void LIVESTOCK_SUBSIDY_ENDPOINTS.uploadSignedDocument(applicationId);
  await simulateDelay();

  const uploadedSignedDocumentUrl = fileToObjectUrl(payload.signedDocument);
  const subsidyStatus = payload.signedBy === 'VET' ? 'VET_SIGNED' : 'SECTOR_SIGNED';
  const applicationStatus =
    mapSubsidyStatusToApplicationStatus(subsidyStatus) ?? 'SUBSIDY_SECTOR_SIGNED';

  patchLivestockWorkflowState(applicationId, {
    status: applicationStatus,
    subsidyStatus,
    subsidyCase: {
      status: subsidyStatus,
      uploadedSignedDocumentUrl,
      sectorSignedAt: new Date().toISOString(),
    },
  });

  return {
    subsidyCase: {
      status: subsidyStatus,
      uploadedSignedDocumentUrl,
    },
  };
}
