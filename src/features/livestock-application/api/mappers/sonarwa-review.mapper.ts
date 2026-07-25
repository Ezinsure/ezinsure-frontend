import type {
  SonarwaReviewDecision,
  SonarwaReviewRecord,
} from '@/features/livestock-application/domain/application-types';

const VALID_DECISIONS = new Set<SonarwaReviewDecision>([
  'APPROVED',
  'APPROVED_WITH_CHANGES',
  'REJECTED',
]);

export function mapSonarwaReviewFromRecord(
  record: Record<string, unknown>,
): SonarwaReviewRecord | undefined {
  const nested =
    record.sonarwaReview && typeof record.sonarwaReview === 'object'
      ? (record.sonarwaReview as Record<string, unknown>)
      : null;
  if (!nested) return undefined;

  const decisionRaw = String(nested.decision ?? '').toUpperCase();
  if (!VALID_DECISIONS.has(decisionRaw as SonarwaReviewDecision)) return undefined;

  return {
    decision: decisionRaw as SonarwaReviewDecision,
    reviewedAt: String(nested.reviewedAt ?? nested.approvedAt ?? new Date().toISOString()),
    reviewedByUserId: nested.reviewedByUserId
      ? String(nested.reviewedByUserId)
      : nested.reviewedBy
        ? String(nested.reviewedBy)
        : undefined,
    reviewedByName: nested.reviewedByName ? String(nested.reviewedByName) : undefined,
    changeComment: nested.changeComment ? String(nested.changeComment) : undefined,
    correctionDocumentUrl: nested.correctionDocumentUrl
      ? String(nested.correctionDocumentUrl)
      : undefined,
    originalVeterinaryCommission:
      nested.originalVeterinaryCommission != null
        ? Number(nested.originalVeterinaryCommission)
        : undefined,
    updatedVeterinaryCommission:
      nested.updatedVeterinaryCommission != null
        ? Number(nested.updatedVeterinaryCommission)
        : undefined,
  };
}
