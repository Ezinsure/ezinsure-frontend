import type {
  SonarwaReviewDecision,
  SonarwaReviewRecord,
  SubsidyDocumentRecord,
} from '@/features/livestock-application/domain/application-types';

const VALID_DECISIONS = new Set<SonarwaReviewDecision>([
  'APPROVED',
  'APPROVED_WITH_CHANGES',
  'REJECTED',
]);

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return undefined;
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (value == null || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function resolveReviewedByName(
  nested: Record<string, unknown>,
  record: Record<string, unknown>,
): string | undefined {
  const nestedBy = nested.reviewedBy;
  if (nestedBy && typeof nestedBy === 'object') {
    const fromNested = pickString((nestedBy as { fullName?: unknown }).fullName);
    if (fromNested) return fromNested;
  }

  const rootBy = record.sonarwaApprovedBy;
  if (rootBy && typeof rootBy === 'object') {
    const fromRoot = pickString((rootBy as { fullName?: unknown }).fullName);
    if (fromRoot) return fromRoot;
  }

  return pickString(nested.reviewedByName, nested.reviewedBy);
}

export function mapSonarwaReviewFromRecord(
  record: Record<string, unknown>,
): SonarwaReviewRecord | undefined {
  const nested =
    record.sonarwaReview && typeof record.sonarwaReview === 'object'
      ? (record.sonarwaReview as Record<string, unknown>)
      : null;

  if (nested) {
    const decisionRaw = String(nested.decision ?? '').toUpperCase();
    if (VALID_DECISIONS.has(decisionRaw as SonarwaReviewDecision)) {
      return {
        decision: decisionRaw as SonarwaReviewDecision,
        reviewedAt: String(
          nested.reviewedAt ??
            nested.approvedAt ??
            record.sonarwaApprovedAt ??
            new Date().toISOString(),
        ),
        reviewedByUserId: pickString(
          nested.reviewedByUserId,
          typeof nested.reviewedBy === 'string' ? nested.reviewedBy : undefined,
          record.sonarwaApprovedBy && typeof record.sonarwaApprovedBy === 'object'
            ? (record.sonarwaApprovedBy as { _id?: unknown })._id
            : undefined,
        ),
        reviewedByName: resolveReviewedByName(nested, record),
        changeComment: pickString(nested.changeComment),
        correctionDocumentUrl: pickString(nested.correctionDocumentUrl),
        originalVeterinaryCommission: pickNumber(
          nested.originalVeterinaryCommission,
          record.originalVeterinaryCommission,
        ),
        updatedVeterinaryCommission: pickNumber(nested.updatedVeterinaryCommission),
      };
    }
  }

  // Fallback when only root-level SONARWA approval fields exist.
  if (record.sonarwaApprovedAt || record.sonarwaApprovedBy) {
    return {
      decision: record.sonarwaRejectionReason ? 'REJECTED' : 'APPROVED',
      reviewedAt: String(record.sonarwaApprovedAt ?? new Date().toISOString()),
      reviewedByName: resolveReviewedByName({}, record),
      reviewedByUserId:
        record.sonarwaApprovedBy && typeof record.sonarwaApprovedBy === 'object'
          ? pickString((record.sonarwaApprovedBy as { _id?: unknown })._id)
          : undefined,
      originalVeterinaryCommission: pickNumber(record.originalVeterinaryCommission),
    };
  }

  return undefined;
}

export function mapSubsidyDocumentsFromRecord(
  record: Record<string, unknown>,
): SubsidyDocumentRecord[] | undefined {
  const raw = Array.isArray(record.subsidyDocuments) ? record.subsidyDocuments : [];
  if (raw.length === 0) return undefined;

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const doc = item as Record<string, unknown>;
      const uploadedSignedDocumentUrl = pickString(
        doc.uploadedSignedDocumentUrl,
        doc.documentUrl,
        doc.fileUrl,
      );
      const notes = pickString(doc.notes);
      if (!uploadedSignedDocumentUrl && !notes) return null;

      return {
        id: pickString(doc._id, doc.id),
        status: pickString(doc.status),
        signedBy: pickString(doc.signedBy),
        uploadedSignedDocumentUrl,
        notes,
        createdAt: pickString(doc.createdAt, doc.uploadedAt),
      } satisfies SubsidyDocumentRecord;
    })
    .filter((doc): doc is SubsidyDocumentRecord => doc !== null);
}
