import { LIVESTOCK_ADMIN_ENDPOINTS } from '@/features/livestock-application/api/endpoints';
import { patchLivestockWorkflowState } from '@/features/livestock-application/api/workflow-session';

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

/**
 * SONARWA representative reviews signed nkunganire (or Tekana-skip path).
 * Backend: POST `LIVESTOCK_ADMIN_ENDPOINTS.reviewSonarwaSubsidy(id)`.
 */
export async function reviewSonarwaSubsidy(
  applicationId: string,
  payload: ReviewSonarwaSubsidyPayload,
): Promise<ReviewSonarwaSubsidyResult> {
  void LIVESTOCK_ADMIN_ENDPOINTS.reviewSonarwaSubsidy(applicationId);
  await simulateDelay();

  if (payload.action === 'reject') {
    patchLivestockWorkflowState(applicationId, {
      subsidyStatus: 'REJECTED',
      subsidyCase: {
        status: 'REJECTED',
        sonarwaRejectionReason: payload.rejectionReason?.trim(),
      },
    });
    return { status: 'SUBSIDY_REJECTED', subsidyStatus: 'REJECTED' };
  }

  patchLivestockWorkflowState(applicationId, {
    status: 'PENDING_COMMISSION_REVIEW',
    subsidyStatus: 'SONARWA_APPROVED',
    subsidyCase: {
      status: 'SONARWA_APPROVED',
      sonarwaApprovedAt: new Date().toISOString(),
    },
  });

  return { status: 'PENDING_COMMISSION_REVIEW', subsidyStatus: 'SONARWA_APPROVED' };
}

export interface ApproveCommissionResult {
  status: 'READY_TO_BE_PAID';
}

/**
 * Finance approves commission and marks application ready to be paid.
 * Backend: PUT `LIVESTOCK_ADMIN_ENDPOINTS.approveCommission(id)`.
 */
export async function approveLivestockCommission(
  applicationId: string,
): Promise<ApproveCommissionResult> {
  void LIVESTOCK_ADMIN_ENDPOINTS.approveCommission(applicationId);
  await simulateDelay();

  patchLivestockWorkflowState(applicationId, {
    status: 'READY_TO_BE_PAID',
  });

  return { status: 'READY_TO_BE_PAID' };
}

export interface MarkCommissionPaidResult {
  status: 'PAID';
}

/**
 * Finance marks veterinary commission as paid.
 * Backend: PUT `LIVESTOCK_ADMIN_ENDPOINTS.markCommissionPaid(id)`.
 */
export async function markLivestockCommissionPaid(
  applicationId: string,
): Promise<MarkCommissionPaidResult> {
  void LIVESTOCK_ADMIN_ENDPOINTS.markCommissionPaid(applicationId);
  await simulateDelay();

  patchLivestockWorkflowState(applicationId, {
    status: 'PAID',
  });

  return { status: 'PAID' };
}
