import type { LivestockIssuedDocuments } from '@/features/livestock-application/domain/application-types';
import { LIVESTOCK_ADMIN_ENDPOINTS } from '@/features/livestock-application/api/endpoints';
import { LIVESTOCK_WORKFLOW_DEMO_MODE } from '@/features/livestock-application/utils/workflow-demo-mode';
import { patchLivestockWorkflowState } from '@/features/livestock-application/api/workflow-session';

function simulateDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 350));
}

export interface IssueLivestockInsurancePayload {
  insuranceCertificate: File;
  contract?: File;
  receipt?: File;
  ebm?: File;
  invoice?: File;
}

export interface IssueLivestockInsuranceResult {
  status: 'INSURANCE_ISSUED';
  issuedDocuments: LivestockIssuedDocuments;
}

function fileToObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Issue livestock insurance / upload contract documents.
 * Backend: PUT `LIVESTOCK_ADMIN_ENDPOINTS.issueInsurance(id)` (multipart).
 * Until the API is live, state is persisted in session workflow patches for UI review.
 */
export async function issueLivestockInsurance(
  applicationId: string,
  payload: IssueLivestockInsurancePayload,
): Promise<IssueLivestockInsuranceResult> {
  void LIVESTOCK_ADMIN_ENDPOINTS.issueInsurance(applicationId);
  if (LIVESTOCK_WORKFLOW_DEMO_MODE) {
    await simulateDelay();
  }

  const issuedDocuments: LivestockIssuedDocuments = {
    insuranceCertificate: fileToObjectUrl(payload.insuranceCertificate),
    contract: payload.contract ? fileToObjectUrl(payload.contract) : undefined,
    receipt: payload.receipt ? fileToObjectUrl(payload.receipt) : undefined,
    ebm: payload.ebm ? fileToObjectUrl(payload.ebm) : undefined,
    invoice: payload.invoice ? fileToObjectUrl(payload.invoice) : undefined,
  };

  patchLivestockWorkflowState(applicationId, {
    status: 'INSURANCE_ISSUED',
    issuedDocuments,
  });

  return { status: 'INSURANCE_ISSUED', issuedDocuments };
}
