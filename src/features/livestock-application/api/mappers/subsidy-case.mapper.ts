import type { LivestockApplicationPackage } from '@/features/livestock-application/domain/application-types';
import {
  mapSubsidyStatus,
  subsidyRequiredFromStatus,
} from '@/features/livestock-application/api/mappers/status.mapper';

export function buildSubsidyCaseFromRecord(
  record: Record<string, unknown>,
  nested?: LivestockApplicationPackage['subsidyCase'],
): LivestockApplicationPackage['subsidyCase'] {
  const subsidyStatusRaw = String(record.subsidyStatus ?? nested?.status ?? '');
  const nestedCase =
    (record.subsidyCase as LivestockApplicationPackage['subsidyCase'] | undefined) ?? nested;

  const docs = Array.isArray(record.subsidyDocuments) ? record.subsidyDocuments : [];
  const latestSigned = [...docs].reverse().find((item) => {
    if (!item || typeof item !== 'object') return false;
    const doc = item as Record<string, unknown>;
    return Boolean(doc.uploadedSignedDocumentUrl || doc.documentUrl || doc.fileUrl);
  }) as Record<string, unknown> | undefined;

  return {
    required:
      typeof record.subsidyRequired === 'boolean'
        ? record.subsidyRequired
        : (nestedCase?.required ?? subsidyRequiredFromStatus(subsidyStatusRaw)),
    status: mapSubsidyStatus(subsidyStatusRaw || nestedCase?.status),
    generatedDocumentUrl:
      nestedCase?.generatedDocumentUrl ??
      (record.generatedDocumentUrl ? String(record.generatedDocumentUrl) : undefined),
    uploadedSignedDocumentUrl:
      nestedCase?.uploadedSignedDocumentUrl ??
      (latestSigned?.uploadedSignedDocumentUrl
        ? String(latestSigned.uploadedSignedDocumentUrl)
        : undefined) ??
      (record.uploadedSignedDocumentUrl ? String(record.uploadedSignedDocumentUrl) : undefined),
    sectorSignedAt: nestedCase?.sectorSignedAt,
    vetSignedAt: nestedCase?.vetSignedAt,
    sonarwaApprovedAt:
      nestedCase?.sonarwaApprovedAt ??
      (record.sonarwaApprovedAt ? String(record.sonarwaApprovedAt) : undefined),
    sonarwaRejectionReason:
      nestedCase?.sonarwaRejectionReason ??
      (record.sonarwaRejectionReason ? String(record.sonarwaRejectionReason) : undefined),
    animalListExportUrl: nestedCase?.animalListExportUrl,
  };
}
