import type {
  GenerateSubsidyDocumentResponse,
  UploadSignedSubsidyPayload,
} from '@/features/livestock-application/domain/application-types';
import { LIVESTOCK_SUBSIDY_ENDPOINTS } from '@/features/livestock-application/api/endpoints';
import type { ApiFetch } from '@/features/livestock-application/api/http';
import { requestJson, unwrapEntityPayload } from '@/features/livestock-application/api/http';
import {
  mapSubsidyStatusToApplicationStatus,
  patchLivestockWorkflowState,
} from '@/features/livestock-application/api/workflow-session';
import { syncLivestockWorkflowCache } from '@/features/livestock-application/api/workflow-cache-sync';
import { isLivestockWorkflowApiLive } from '@/features/livestock-application/utils/workflow-demo-mode';

function simulateDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 350));
}

function fileToObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

export interface UploadSignedSubsidyResult {
  status: string;
  subsidyStatus: string;
  uploadedSignedDocumentUrl: string;
  subsidyCase: {
    status: string;
    uploadedSignedDocumentUrl: string;
  };
}

function parseUploadSignedSubsidyResponse(payload: unknown): UploadSignedSubsidyResult {
  const data = unwrapEntityPayload(payload);
  const row =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : (payload as Record<string, unknown>);

  const uploadedSignedDocumentUrl = String(
    row.uploadedSignedDocumentUrl ??
      (row.subsidyCase as { uploadedSignedDocumentUrl?: string } | undefined)?.uploadedSignedDocumentUrl ??
      '',
  );
  const subsidyStatus = String(row.subsidyStatus ?? 'SECTOR_SIGNED');
  const status = String(row.status ?? 'SUBSIDY_SECTOR_SIGNED');

  return {
    status,
    subsidyStatus,
    uploadedSignedDocumentUrl,
    subsidyCase: {
      status: subsidyStatus,
      uploadedSignedDocumentUrl,
    },
  };
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

async function simulateUploadSignedSubsidyDocument(
  applicationId: string,
  payload: UploadSignedSubsidyPayload,
): Promise<UploadSignedSubsidyResult> {
  await simulateDelay();

  const uploadedSignedDocumentUrl = fileToObjectUrl(payload.signedDocument);
  const subsidyStatus = payload.signedBy === 'VET' ? 'VET_SIGNED' : 'SECTOR_SIGNED';
  const applicationStatus =
    mapSubsidyStatusToApplicationStatus(subsidyStatus) ?? 'SUBSIDY_SECTOR_SIGNED';

  const result: UploadSignedSubsidyResult = {
    status: applicationStatus,
    subsidyStatus,
    uploadedSignedDocumentUrl,
    subsidyCase: {
      status: subsidyStatus,
      uploadedSignedDocumentUrl,
    },
  };

  syncLivestockWorkflowCache(applicationId, {
    status: result.status,
    subsidyStatus: result.subsidyStatus,
    uploadedSignedDocumentUrl: result.uploadedSignedDocumentUrl,
  });
  return result;
}

/**
 * Upload a sector-signed nkunganire document.
 * Backend: PUT multipart `/uploadLivestockSignedSubsidy/{id}`.
 */
export async function uploadSignedSubsidyDocument(
  apiFetch: ApiFetch,
  applicationId: string,
  payload: UploadSignedSubsidyPayload,
): Promise<UploadSignedSubsidyResult> {
  if (!isLivestockWorkflowApiLive('uploadSignedSubsidy')) {
    return simulateUploadSignedSubsidyDocument(applicationId, payload);
  }

  const formData = new FormData();
  formData.append(
    'signedSubsidyDocument',
    payload.signedDocument,
    payload.signedDocument.name || 'signed-nkunganire',
  );
  formData.append('signedBy', payload.signedBy);
  if (payload.notes?.trim()) {
    formData.append('notes', payload.notes.trim());
  }

  const response = await requestJson<unknown>(
    apiFetch,
    LIVESTOCK_SUBSIDY_ENDPOINTS.uploadSignedDocument(applicationId),
    {
      method: 'PUT',
      body: formData,
    },
    'subsidy-upload',
  );

  const result = parseUploadSignedSubsidyResponse(response);
  syncLivestockWorkflowCache(applicationId, {
    status: result.status,
    subsidyStatus: result.subsidyStatus,
    uploadedSignedDocumentUrl: result.uploadedSignedDocumentUrl,
  });
  return result;
}
