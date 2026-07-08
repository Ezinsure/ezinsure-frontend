import { LIVESTOCK_ADMIN_ENDPOINTS } from '@/features/livestock-application/api/endpoints';
import type { ApiFetch } from '@/features/livestock-application/api/http';
import { requestJson, unwrapEntityPayload } from '@/features/livestock-application/api/http';
import { syncLivestockWorkflowCache } from '@/features/livestock-application/api/workflow-cache-sync';
import { patchLivestockWorkflowState } from '@/features/livestock-application/api/workflow-session';
import { isLivestockWorkflowApiLive } from '@/features/livestock-application/utils/workflow-demo-mode';

function simulateDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 350));
}

export interface ReviewSonarwaSubsidyPayload {
  action: 'approve' | 'reject';
  rejectionReason?: string;
}

export interface ReviewSonarwaSubsidyResult {
  status: string;
  subsidyStatus?: string;
}

function parseReviewSonarwaResponse(payload: unknown): ReviewSonarwaSubsidyResult {
  const data = unwrapEntityPayload(payload);
  const row =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : (payload as Record<string, unknown>);

  return {
    status: String(row.status ?? ''),
    subsidyStatus: row.subsidyStatus ? String(row.subsidyStatus) : undefined,
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

  const result = { status: 'PENDING_COMMISSION_REVIEW', subsidyStatus: 'SONARWA_APPROVED' };
  syncLivestockWorkflowCache(applicationId, {
    ...result,
    subsidyCase: {
      status: 'SONARWA_APPROVED',
      sonarwaApprovedAt: new Date().toISOString(),
    },
  });
  return result;
}

/**
 * SONARWA representative reviews signed nkunganire (or Tekana-skip path).
 * Backend: POST `/reviewLivestockSubsidySonarwa/{id}`.
 */
export async function reviewSonarwaSubsidy(
  apiFetch: ApiFetch,
  applicationId: string,
  payload: ReviewSonarwaSubsidyPayload,
): Promise<ReviewSonarwaSubsidyResult> {
  if (!isLivestockWorkflowApiLive('reviewSonarwaSubsidy')) {
    return simulateReviewSonarwaSubsidy(applicationId, payload);
  }

  const response = await requestJson<unknown>(
    apiFetch,
    LIVESTOCK_ADMIN_ENDPOINTS.reviewSonarwaSubsidy(applicationId),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: payload.action,
        ...(payload.action === 'reject' && payload.rejectionReason
          ? { rejectionReason: payload.rejectionReason.trim() }
          : {}),
      }),
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

  syncLivestockWorkflowCache(applicationId, {
    status: result.status,
    subsidyStatus: result.subsidyStatus,
    subsidyCase: {
      status: 'SONARWA_APPROVED',
      sonarwaApprovedAt: new Date().toISOString(),
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
