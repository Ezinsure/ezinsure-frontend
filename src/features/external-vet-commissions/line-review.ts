/**
 * Line-level review rules for commission claim batches.
 * Payable / reclaim amounts consider APPROVED lines only.
 */

import {
  calcReclaimBreakdown,
  type ExternalVetCommissionBatch,
  type ExternalVetCommissionLine,
  type ExternalVetCommissionStatus,
  type ExternalVetLineReviewEvent,
  type ExternalVetLineStatus,
  type ExternalVetReviewStage,
  type ExternalVetsViewRole,
  type ReclaimMoneyBreakdown,
} from './domain';

export type LineStatusCounts = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export type PayableLineSummary = ReclaimMoneyBreakdown & {
  counts: LineStatusCounts;
  /** Gross totals across every line (including pending/rejected). */
  gross: ReclaimMoneyBreakdown;
  /** Amounts on rejected lines only. */
  excludedRejected: ReclaimMoneyBreakdown;
  /** Amounts still awaiting a decision. */
  excludedPending: ReclaimMoneyBreakdown;
};

export type ReviewLineInput = {
  batchId: string;
  lineId: string;
  decision: 'APPROVED' | 'REJECTED';
  reason?: string;
  stage: ExternalVetReviewStage;
};

export type BulkReviewLinesInput = {
  batchId: string;
  lineIds: string[];
  decision: 'APPROVED' | 'REJECTED';
  reason?: string;
  stage: ExternalVetReviewStage;
};

export function countLineStatuses(
  lines: Pick<ExternalVetCommissionLine, 'lineStatus'>[],
): LineStatusCounts {
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  for (const line of lines) {
    if (line.lineStatus === 'APPROVED') approved += 1;
    else if (line.lineStatus === 'REJECTED') rejected += 1;
    else pending += 1;
  }
  return {
    total: lines.length,
    pending,
    approved,
    rejected,
  };
}

function sumCommissions(
  lines: Pick<
    ExternalVetCommissionLine,
    'vetCommission' | 'companyCommission'
  >[],
): ReclaimMoneyBreakdown {
  let vet = 0;
  let company = 0;
  for (const line of lines) {
    vet += line.vetCommission || 0;
    company += line.companyCommission || 0;
  }
  return calcReclaimBreakdown(vet, company);
}

/** Payable / reclaim breakdown — APPROVED lines only. */
export function summarizePayableLines(
  lines: ExternalVetCommissionLine[],
): PayableLineSummary {
  const counts = countLineStatuses(lines);
  const approved = lines.filter((l) => l.lineStatus === 'APPROVED');
  const rejected = lines.filter((l) => l.lineStatus === 'REJECTED');
  const pending = lines.filter((l) => l.lineStatus === 'PENDING_REVIEW');
  const payable = sumCommissions(approved);
  return {
    ...payable,
    counts,
    gross: sumCommissions(lines),
    excludedRejected: sumCommissions(rejected),
    excludedPending: sumCommissions(pending),
  };
}

/** Map hub view role → review stage stamped on audit events. */
export function reviewStageForViewRole(
  viewRole: ExternalVetsViewRole | 'vet',
): ExternalVetReviewStage | null {
  switch (viewRole) {
    case 'sonarwa':
      return 'SONARWA';
    case 'admin':
    case 'super_admin':
      return 'ADMIN';
    case 'finance':
      return 'FINANCE';
    case 'vet':
    default:
      return null;
  }
}

/**
 * Batch statuses where a role may still decide individual lines.
 * Flow: Sonarwa → Admin → Finance (before payout completes).
 */
export function canReviewLinesAtBatchStatus(
  stage: ExternalVetReviewStage,
  batchStatus: ExternalVetCommissionStatus,
): boolean {
  if (
    batchStatus === 'REJECTED' ||
    batchStatus === 'REIMBURSED_BY_SONARWA' ||
    batchStatus === 'DRAFT'
  ) {
    return false;
  }
  if (stage === 'SONARWA') {
    return batchStatus === 'PENDING_SONARWA_REVIEW';
  }
  if (stage === 'ADMIN') {
    return batchStatus === 'PENDING_ADMIN_REVIEW';
  }
  if (stage === 'FINANCE') {
    return (
      batchStatus === 'READY_TO_BE_PAID' ||
      batchStatus === 'PAYMENT_INITIATED'
    );
  }
  return false;
}

export function canActorReviewLine(args: {
  stage: ExternalVetReviewStage;
  batchStatus: ExternalVetCommissionStatus;
  allowed: boolean;
}): boolean {
  if (!args.allowed) return false;
  return canReviewLinesAtBatchStatus(args.stage, args.batchStatus);
}

/** True when every line has APPROVED or REJECTED (no pending). */
export function isBatchFullyReviewed(
  lines: Pick<ExternalVetCommissionLine, 'lineStatus'>[],
): boolean {
  if (!lines.length) return false;
  return lines.every((l) => l.lineStatus !== 'PENDING_REVIEW');
}

/**
 * True when every line has an audit event from this review stage.
 * Used so Admin cannot skip re-confirmation after SONARWA decisions.
 */
export function isBatchFullyReviewedAtStage(
  lines: Pick<ExternalVetCommissionLine, 'reviewEvents'>[],
  stage: ExternalVetReviewStage,
): boolean {
  if (!lines.length) return false;
  return lines.every((line) =>
    (line.reviewEvents ?? []).some((event) => event.stage === stage),
  );
}

export function countLinesMissingStageReview(
  lines: Pick<ExternalVetCommissionLine, 'reviewEvents'>[],
  stage: ExternalVetReviewStage,
): number {
  return lines.filter(
    (line) =>
      !(line.reviewEvents ?? []).some((event) => event.stage === stage),
  ).length;
}

/** Latest decision recorded for a given stage, if any. */
export function latestStageDecision(
  events: ExternalVetLineReviewEvent[] | undefined,
  stage: ExternalVetReviewStage,
): 'APPROVED' | 'REJECTED' | null {
  const matching = (events ?? []).filter((e) => e.stage === stage);
  if (!matching.length) return null;
  return matching[matching.length - 1]!.decision;
}

export function areAllLinesRejected(
  lines: Pick<ExternalVetCommissionLine, 'lineStatus'>[],
): boolean {
  return lines.length > 0 && lines.every((l) => l.lineStatus === 'REJECTED');
}

export function hasPayableApprovedLines(
  lines: Pick<ExternalVetCommissionLine, 'lineStatus'>[],
): boolean {
  return lines.some((l) => l.lineStatus === 'APPROVED');
}

export function canSubmitDraftBatch(
  batch: Pick<ExternalVetCommissionBatch, 'status' | 'lines'>,
): boolean {
  return (
    (batch.status === 'DRAFT' || batch.status === 'REJECTED') &&
    batch.lines.length > 0
  );
}

/**
 * Admin may mark the batch ready to pay only when every line is decided
 * and at least one line remains approved.
 * When reviewEvents exist, every line must also have an ADMIN-stage decision
 * (SONARWA approval alone is not enough).
 */
export function canApproveBatchForPayment(
  batch: Pick<ExternalVetCommissionBatch, 'status' | 'lines'>,
): boolean {
  if (batch.status !== 'PENDING_ADMIN_REVIEW') return false;
  if (!isBatchFullyReviewed(batch.lines)) return false;
  const hasAuditTrail = batch.lines.some(
    (l) => (l.reviewEvents?.length ?? 0) > 0,
  );
  if (hasAuditTrail && !isBatchFullyReviewedAtStage(batch.lines, 'ADMIN')) {
    return false;
  }
  return hasPayableApprovedLines(batch.lines);
}

/**
 * Sonarwa may send the claim to ezInsure admin once every line is decided
 * and at least one line remains approved.
 */
export function canSendBatchToAdminReview(
  batch: Pick<ExternalVetCommissionBatch, 'status' | 'lines'>,
): boolean {
  if (batch.status !== 'PENDING_SONARWA_REVIEW') return false;
  if (!isBatchFullyReviewed(batch.lines)) return false;
  const hasAuditTrail = batch.lines.some(
    (l) => (l.reviewEvents?.length ?? 0) > 0,
  );
  if (hasAuditTrail && !isBatchFullyReviewedAtStage(batch.lines, 'SONARWA')) {
    return false;
  }
  return hasPayableApprovedLines(batch.lines);
}

export function buildReviewEvent(input: {
  decision: 'APPROVED' | 'REJECTED';
  reason?: string;
  stage: ExternalVetReviewStage;
  actorId?: string;
  actorName: string;
  actorRole?: string;
  at?: string;
}): ExternalVetLineReviewEvent {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actorId: input.actorId,
    actorName: input.actorName,
    actorRole: input.actorRole,
    stage: input.stage,
    decision: input.decision,
    reason: input.reason?.trim() || undefined,
    at: input.at ?? new Date().toISOString(),
  };
}

export function applyReviewEventToLine(
  line: ExternalVetCommissionLine,
  event: ExternalVetLineReviewEvent,
): ExternalVetCommissionLine {
  const lineStatus: ExternalVetLineStatus =
    event.decision === 'REJECTED' ? 'REJECTED' : 'APPROVED';
  return {
    ...line,
    lineStatus,
    reviewEvents: [...(line.reviewEvents ?? []), event],
  };
}

/** Optimistic / offline-friendly patch when the review API is unavailable. */
export function applyReviewToBatchLines(
  batch: ExternalVetCommissionBatch,
  lineIds: string[],
  event: ExternalVetLineReviewEvent,
): ExternalVetCommissionBatch {
  const idSet = new Set(lineIds);
  const lines = batch.lines.map((line) =>
    idSet.has(line.id) ? applyReviewEventToLine(line, event) : line,
  );
  const payable = summarizePayableLines(lines);
  return {
    ...batch,
    lines,
    lineCount: lines.length,
    totalVetCommission: payable.totalVetCommission,
    totalCompanyCommission: payable.totalCompanyCommission,
    totalCommission: payable.totalCommission,
  };
}

export function applyReviewToLineListItem<
  T extends ExternalVetCommissionLine & { lineStatus: ExternalVetLineStatus },
>(line: T, event: ExternalVetLineReviewEvent): T {
  return {
    ...line,
    ...applyReviewEventToLine(line, event),
  };
}
