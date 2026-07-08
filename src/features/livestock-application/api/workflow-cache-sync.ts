import type {
  LivestockApplicationStatus,
  LivestockApplicationPackage,
  LivestockIssuedDocuments,
} from '@/features/livestock-application/domain/application-types';
import { patchCachedLivestockApplicationRow } from '@/features/livestock-application/api/livestock-application-session-cache';
import { mapSubsidyStatus } from '@/features/livestock-application/api/mappers/status.mapper';
import { patchLivestockWorkflowState } from '@/features/livestock-application/api/workflow-session';

/** Apply workflow action API response fields to session cache + workflow patches. */
export function syncLivestockWorkflowCache(
  applicationId: string,
  response: {
    status?: string;
    subsidyStatus?: string;
    issuedDocuments?: LivestockIssuedDocuments;
    uploadedSignedDocumentUrl?: string;
    subsidyCase?: Partial<LivestockApplicationPackage['subsidyCase']>;
  },
): void {
  const status = response.status;
  const subsidyStatus = response.subsidyStatus;
  const issuedDocuments = response.issuedDocuments;
  const uploadedSignedDocumentUrl = response.uploadedSignedDocumentUrl;
  const nestedSubsidyCase = response.subsidyCase;

  patchLivestockWorkflowState(applicationId, {
    ...(status ? { status: status as LivestockApplicationStatus } : {}),
    ...(subsidyStatus ? { subsidyStatus } : {}),
    ...(issuedDocuments ? { issuedDocuments } : {}),
    ...(uploadedSignedDocumentUrl || nestedSubsidyCase
      ? {
          subsidyCase: {
            ...nestedSubsidyCase,
            ...(uploadedSignedDocumentUrl ? { uploadedSignedDocumentUrl } : {}),
            ...(subsidyStatus ? { status: mapSubsidyStatus(subsidyStatus) } : {}),
            sectorSignedAt: nestedSubsidyCase?.sectorSignedAt ?? new Date().toISOString(),
          },
        }
      : {}),
  });

  const listPatch: Record<string, unknown> = {};
  if (status) listPatch.status = status;
  if (subsidyStatus) listPatch.subsidyStatus = subsidyStatus;
  if (issuedDocuments) listPatch.issuedDocuments = issuedDocuments;
  if (uploadedSignedDocumentUrl) listPatch.uploadedSignedDocumentUrl = uploadedSignedDocumentUrl;

  if (Object.keys(listPatch).length > 0) {
    patchCachedLivestockApplicationRow(applicationId, listPatch);
  }
}
