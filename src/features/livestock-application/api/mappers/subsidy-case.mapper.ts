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
      (record.uploadedSignedDocumentUrl ? String(record.uploadedSignedDocumentUrl) : undefined),
    sectorSignedAt: nestedCase?.sectorSignedAt,
    vetSignedAt: nestedCase?.vetSignedAt,
    sonarwaApprovedAt: nestedCase?.sonarwaApprovedAt,
    sonarwaRejectionReason: nestedCase?.sonarwaRejectionReason,
    animalListExportUrl: nestedCase?.animalListExportUrl,
  };
}
