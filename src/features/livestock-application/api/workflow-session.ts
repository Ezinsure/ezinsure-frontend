import type {
  LivestockApplicationPackage,
  LivestockApplicationStatus,
  LivestockIssuedDocuments,
  SubsidyCaseStatus,
} from '@/features/livestock-application/domain/application-types';
import { patchCachedLivestockApplicationRow } from '@/features/livestock-application/api/livestock-application-session-cache';

const WORKFLOW_PATCH_KEY = 'ezinsure.livestock.workflow';

export interface LivestockWorkflowPatch {
  status?: LivestockApplicationStatus;
  issuedDocuments?: Partial<LivestockIssuedDocuments>;
  paymentProof?: Partial<LivestockApplicationPackage['paymentProof']>;
  subsidyCase?: Partial<LivestockApplicationPackage['subsidyCase']>;
  subsidyStatus?: string;
  subsidyRequired?: boolean;
  sonarwaReview?: Partial<NonNullable<LivestockApplicationPackage['sonarwaReview']>>;
}

function readPatches(): Record<string, LivestockWorkflowPatch> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(WORKFLOW_PATCH_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LivestockWorkflowPatch>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePatches(patches: Record<string, LivestockWorkflowPatch>): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(WORKFLOW_PATCH_KEY, JSON.stringify(patches));
  } catch {
    /* ignore */
  }
}

export function patchLivestockWorkflowState(
  applicationId: string,
  patch: LivestockWorkflowPatch,
): void {
  const all = readPatches();
  const prev = all[applicationId] ?? {};
  all[applicationId] = {
    ...prev,
    ...patch,
    issuedDocuments: { ...prev.issuedDocuments, ...patch.issuedDocuments },
    paymentProof: { ...prev.paymentProof, ...patch.paymentProof },
    subsidyCase: { ...prev.subsidyCase, ...patch.subsidyCase },
    sonarwaReview: { ...prev.sonarwaReview, ...patch.sonarwaReview },
  };
  writePatches(all);

  const listPatch: Record<string, unknown> = {};
  if (patch.status) listPatch.status = patch.status;
  if (patch.paymentProof?.status) listPatch.paymentProofStatus = patch.paymentProof.status;
  if (patch.paymentProof?.status) listPatch.paidStatus = patch.paymentProof.status;
  if (patch.paymentProof?.documentUrl) listPatch.proofOfPayment = patch.paymentProof.documentUrl;
  if (patch.paymentProof?.transactionId) listPatch.transactionId = patch.paymentProof.transactionId;
  if (patch.subsidyStatus) listPatch.subsidyStatus = patch.subsidyStatus;
  if (typeof patch.subsidyRequired === 'boolean') {
    listPatch.subsidyRequired = patch.subsidyRequired;
  }
  if (Object.keys(listPatch).length > 0) {
    patchCachedLivestockApplicationRow(applicationId, listPatch);
  }
}

export function applyWorkflowPatch(
  pkg: LivestockApplicationPackage,
): LivestockApplicationPackage {
  const patch = readPatches()[pkg._id];
  if (!patch) return pkg;

  return {
    ...pkg,
    status: patch.status ?? pkg.status,
    issuedDocuments: { ...pkg.issuedDocuments, ...patch.issuedDocuments },
    paymentProof: {
      ...pkg.paymentProof,
      ...patch.paymentProof,
    },
    subsidyCase: {
      ...pkg.subsidyCase,
      ...patch.subsidyCase,
      required: patch.subsidyCase?.required ?? patch.subsidyRequired ?? pkg.subsidyCase.required,
    },
    sonarwaReview: patch.sonarwaReview
      ? {
          decision: (patch.sonarwaReview.decision ??
            pkg.sonarwaReview?.decision ??
            'APPROVED') as NonNullable<LivestockApplicationPackage['sonarwaReview']>['decision'],
          reviewedAt:
            patch.sonarwaReview.reviewedAt ??
            pkg.sonarwaReview?.reviewedAt ??
            new Date().toISOString(),
          reviewedByUserId:
            patch.sonarwaReview.reviewedByUserId ?? pkg.sonarwaReview?.reviewedByUserId,
          reviewedByName: patch.sonarwaReview.reviewedByName ?? pkg.sonarwaReview?.reviewedByName,
          changeComment: patch.sonarwaReview.changeComment ?? pkg.sonarwaReview?.changeComment,
          correctionDocumentUrl:
            patch.sonarwaReview.correctionDocumentUrl ?? pkg.sonarwaReview?.correctionDocumentUrl,
          originalVeterinaryCommission:
            patch.sonarwaReview.originalVeterinaryCommission ??
            pkg.sonarwaReview?.originalVeterinaryCommission,
          updatedVeterinaryCommission:
            patch.sonarwaReview.updatedVeterinaryCommission ??
            pkg.sonarwaReview?.updatedVeterinaryCommission,
        }
      : pkg.sonarwaReview,
  };
}

export function mapSubsidyStatusToApplicationStatus(
  subsidyStatus: SubsidyCaseStatus,
): LivestockApplicationStatus | null {
  switch (subsidyStatus) {
    case 'DOC_GENERATED':
      return 'SUBSIDY_DOC_REQUIRED';
    case 'SECTOR_PENDING':
      return 'SUBSIDY_SECTOR_PENDING';
    case 'SECTOR_SIGNED':
    case 'VET_SIGNED':
      return 'SUBSIDY_SECTOR_SIGNED';
    case 'SONARWA_APPROVED':
      return 'SUBSIDY_SONARWA_APPROVED';
    default:
      return null;
  }
}
