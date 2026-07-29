import { LIVESTOCK_ADMIN_ENDPOINTS } from '@/features/livestock-application/api/endpoints';
import type { ApiFetch } from '@/features/livestock-application/api/http';
import { requestJson, unwrapEntityPayload } from '@/features/livestock-application/api/http';
import { mapFlatApplicationToListItem } from '@/features/livestock-application/api/mappers/flat.mapper';
import { extractApplicationsRawRows } from '@/features/livestock-application/api/mappers/guards';
import { syncLivestockWorkflowCache } from '@/features/livestock-application/api/workflow-cache-sync';
import { patchLivestockWorkflowState } from '@/features/livestock-application/api/workflow-session';
import type { LivestockApplicationListItem } from '@/features/livestock-application/domain/application-types';
import { isLivestockWorkflowApiLive } from '@/features/livestock-application/utils/workflow-demo-mode';

function simulateDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 350));
}

export interface ReviewSonarwaSubsidyPayload {
  /** Clean approval — flow continues to admin review. */
  action: 'approve' | 'approve_with_changes' | 'reject';
  rejectionReason?: string;
  /** Required for approve_with_changes — corrected evidence (excl. fraud). */
  correctionDocument?: File;
  /** Required for approve_with_changes — vet commission that should be paid. */
  updatedVeterinaryCommission?: number;
  /** Required for approve_with_changes — why the commission/doc changed. */
  changeComment?: string;
}

export interface ReviewSonarwaSubsidyResult {
  status: string;
  subsidyStatus?: string;
  sonarwaReview?: {
    decision?: string;
    correctionDocumentUrl?: string;
    updatedVeterinaryCommission?: number;
    changeComment?: string;
  };
}

function parseReviewSonarwaResponse(payload: unknown): ReviewSonarwaSubsidyResult {
  const data = unwrapEntityPayload(payload);
  const row =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : (payload as Record<string, unknown>);

  const nestedReview =
    row.sonarwaReview && typeof row.sonarwaReview === 'object'
      ? (row.sonarwaReview as Record<string, unknown>)
      : undefined;

  return {
    status: String(row.status ?? ''),
    subsidyStatus: row.subsidyStatus ? String(row.subsidyStatus) : undefined,
    sonarwaReview: nestedReview
      ? {
          decision: nestedReview.decision ? String(nestedReview.decision) : undefined,
          correctionDocumentUrl: nestedReview.correctionDocumentUrl
            ? String(nestedReview.correctionDocumentUrl)
            : undefined,
          updatedVeterinaryCommission:
            nestedReview.updatedVeterinaryCommission != null
              ? Number(nestedReview.updatedVeterinaryCommission)
              : undefined,
          changeComment: nestedReview.changeComment
            ? String(nestedReview.changeComment)
            : undefined,
        }
      : undefined,
  };
}

async function simulateReviewSonarwaSubsidy(
  applicationId: string,
  payload: ReviewSonarwaSubsidyPayload,
): Promise<ReviewSonarwaSubsidyResult> {
  await simulateDelay();

  if (payload.action === 'reject') {
    const result = { status: 'SUBSIDY_REJECTED', subsidyStatus: 'REJECTED' };
    patchLivestockWorkflowState(applicationId, {
      subsidyStatus: 'REJECTED',
      subsidyCase: {
        status: 'REJECTED',
        sonarwaRejectionReason: payload.rejectionReason?.trim(),
      },
    });
    return result;
  }

  const decision =
    payload.action === 'approve_with_changes' ? 'APPROVED_WITH_CHANGES' : 'APPROVED';
  const result = { status: 'PENDING_ADMIN_REVIEW', subsidyStatus: 'SONARWA_APPROVED' };
  syncLivestockWorkflowCache(applicationId, {
    ...result,
    subsidyCase: {
      status: 'SONARWA_APPROVED',
      sonarwaApprovedAt: new Date().toISOString(),
    },
    sonarwaReview: {
      decision,
      reviewedAt: new Date().toISOString(),
      changeComment: payload.changeComment?.trim(),
      correctionDocumentUrl:
        payload.correctionDocument != null
          ? URL.createObjectURL(payload.correctionDocument)
          : undefined,
      updatedVeterinaryCommission: payload.updatedVeterinaryCommission,
      originalVeterinaryCommission: undefined,
    },
  });
  return result;
}

/**
 * SONARWA representative reviews signed nkunganire (or Tekana-skip path).
 * Backend: PUT multipart `/reviewLivestockSubsidySonarwa/{id}`.
 *
 * Actions:
 * - `approve` — clean approval
 * - `approve_with_changes` — corrected document + updated vet commission + comment
 * - `reject` — send back for correction (legacy / admin path)
 */
export async function reviewSonarwaSubsidy(
  apiFetch: ApiFetch,
  applicationId: string,
  payload: ReviewSonarwaSubsidyPayload,
): Promise<ReviewSonarwaSubsidyResult> {
  if (!isLivestockWorkflowApiLive('reviewSonarwaSubsidy')) {
    return simulateReviewSonarwaSubsidy(applicationId, payload);
  }

  const body = new FormData();
  body.append('action', payload.action);

  if (payload.action === 'reject' && payload.rejectionReason?.trim()) {
    body.append('rejectionReason', payload.rejectionReason.trim());
  }

  if (payload.action === 'approve_with_changes') {
    if (payload.correctionDocument) {
      body.append('correctionDocument', payload.correctionDocument);
    }
    if (payload.updatedVeterinaryCommission != null) {
      body.append('updatedVeterinaryCommission', String(payload.updatedVeterinaryCommission));
    }
    if (payload.changeComment?.trim()) {
      body.append('changeComment', payload.changeComment.trim());
    }
  }

  const response = await requestJson<unknown>(
    apiFetch,
    LIVESTOCK_ADMIN_ENDPOINTS.reviewSonarwaSubsidy(applicationId),
    {
      method: 'PUT',
      body,
    },
    'sonarwa-review',
  );

  const result = parseReviewSonarwaResponse(response);

  if (payload.action === 'reject') {
    patchLivestockWorkflowState(applicationId, {
      subsidyStatus: result.subsidyStatus ?? 'REJECTED',
      subsidyCase: {
        status: 'REJECTED',
        sonarwaRejectionReason: payload.rejectionReason?.trim(),
      },
    });
    return result;
  }

  const decision =
    payload.action === 'approve_with_changes' ? 'APPROVED_WITH_CHANGES' : 'APPROVED';

  syncLivestockWorkflowCache(applicationId, {
    status: result.status,
    subsidyStatus: result.subsidyStatus,
    subsidyCase: {
      status: 'SONARWA_APPROVED',
      sonarwaApprovedAt: new Date().toISOString(),
    },
    sonarwaReview: {
      decision,
      reviewedAt: new Date().toISOString(),
      changeComment: payload.changeComment?.trim() ?? result.sonarwaReview?.changeComment,
      correctionDocumentUrl: result.sonarwaReview?.correctionDocumentUrl,
      updatedVeterinaryCommission:
        payload.updatedVeterinaryCommission ?? result.sonarwaReview?.updatedVeterinaryCommission,
    },
  });

  return result;
}

export interface ApproveCommissionPayload {
  notes?: string;
}

export interface ApproveCommissionResult {
  status: 'READY_TO_BE_PAID';
}

export interface MarkCommissionPaidPayload {
  paymentReference?: string;
}

export interface MarkCommissionPaidResult {
  status: 'PAID';
}

export interface LivestockCommissionReviewQueue {
  items: LivestockApplicationListItem[];
  count: number;
  totalVeterinaryCommission: number;
}

function readCommissionQueueMeta(payload: unknown, itemCount: number): {
  count: number;
  totalVeterinaryCommission: number;
} {
  const root =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const nested =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;

  const count = Number(nested.count ?? nested.total ?? root.count ?? root.total ?? itemCount);
  const totalVeterinaryCommission = Number(
    nested.totalVeterinaryCommission ??
      nested.totalAgentCommission ??
      nested.veterinaryCommission ??
      root.totalVeterinaryCommission ??
      root.totalAgentCommission ??
      0,
  );

  return {
    count: Number.isFinite(count) ? count : itemCount,
    totalVeterinaryCommission: Number.isFinite(totalVeterinaryCommission)
      ? totalVeterinaryCommission
      : 0,
  };
}

function mapCommissionReviewRows(payload: unknown): LivestockApplicationListItem[] {
  const rows = extractApplicationsRawRows(payload);
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => mapFlatApplicationToListItem(row));
}

/**
 * Applications in `PENDING_ADMIN_REVIEW` awaiting finance/admin approval.
 * Backend: GET `/getVeterinaryApplicationsPendingAdminReview`.
 */
export async function fetchLivestockApplicationsPendingAdminReview(
  apiFetch: ApiFetch,
): Promise<LivestockCommissionReviewQueue> {
  const response = await requestJson<unknown>(
    apiFetch,
    LIVESTOCK_ADMIN_ENDPOINTS.applicationsPendingAdminReview(),
    { method: 'GET' },
    'list',
  );

  const items = mapCommissionReviewRows(response);
  const meta = readCommissionQueueMeta(response, items.length);

  if (meta.totalVeterinaryCommission <= 0) {
    meta.totalVeterinaryCommission = items.reduce(
      (sum, item) => sum + (item.veterinaryCommission ?? 0),
      0,
    );
  }

  return {
    items: items.slice().sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    ),
    count: meta.count || items.length,
    totalVeterinaryCommission: meta.totalVeterinaryCommission,
  };
}

/**
 * Finance approves commission and marks application ready to be paid.
 * Backend: PUT `/approveLivestockCommission/{id}`.
 */
export async function approveLivestockCommission(
  apiFetch: ApiFetch,
  applicationId: string,
  payload?: ApproveCommissionPayload,
): Promise<ApproveCommissionResult> {
  if (!isLivestockWorkflowApiLive('approveCommission')) {
    await simulateDelay();
    patchLivestockWorkflowState(applicationId, { status: 'READY_TO_BE_PAID' });
    return { status: 'READY_TO_BE_PAID' };
  }

  const response = await requestJson<unknown>(
    apiFetch,
    LIVESTOCK_ADMIN_ENDPOINTS.approveCommission(applicationId),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(payload?.notes?.trim() ? { notes: payload.notes.trim() } : {}),
      }),
    },
    'commission-approve',
  );

  const data = unwrapEntityPayload(response);
  const row =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : (response as Record<string, unknown>);
  const status = String(row.status ?? 'READY_TO_BE_PAID');

  syncLivestockWorkflowCache(applicationId, { status });
  return { status: status as ApproveCommissionResult['status'] };
}

/**
 * Finance marks veterinary commission as paid.
 * Backend: PUT `/markLivestockCommissionPaid/{id}`.
 */
export async function markLivestockCommissionPaid(
  apiFetch: ApiFetch,
  applicationId: string,
  payload?: MarkCommissionPaidPayload,
): Promise<MarkCommissionPaidResult> {
  if (!isLivestockWorkflowApiLive('markCommissionPaid')) {
    await simulateDelay();
    patchLivestockWorkflowState(applicationId, { status: 'PAID' });
    return { status: 'PAID' };
  }

  const response = await requestJson<unknown>(
    apiFetch,
    LIVESTOCK_ADMIN_ENDPOINTS.markCommissionPaid(applicationId),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(payload?.paymentReference?.trim()
          ? { paymentReference: payload.paymentReference.trim() }
          : {}),
      }),
    },
    'commission-paid',
  );

  const data = unwrapEntityPayload(response);
  const row =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : (response as Record<string, unknown>);
  const status = String(row.status ?? 'PAID');

  syncLivestockWorkflowCache(applicationId, { status });
  return { status: status as MarkCommissionPaidResult['status'] };
}
