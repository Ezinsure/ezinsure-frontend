import type { LivestockIssuedDocuments } from '@/features/livestock-application/domain/application-types';
import { LIVESTOCK_ADMIN_ENDPOINTS } from '@/features/livestock-application/api/endpoints';
import type { ApiFetch } from '@/features/livestock-application/api/http';
import { requestJson, unwrapEntityPayload } from '@/features/livestock-application/api/http';
import { syncLivestockWorkflowCache } from '@/features/livestock-application/api/workflow-cache-sync';
import { isLivestockWorkflowApiLive } from '@/features/livestock-application/utils/workflow-demo-mode';

function simulateDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 350));
}

/**
 * Matches PUT `/issueLivestockInsurance/{id}` Swagger schema:
 * - contract: required
 * - receipt: optional
 */
export interface IssueLivestockInsurancePayload {
  contract: File;
  receipt?: File;
}

export interface IssueLivestockInsuranceResult {
  status: 'INSURANCE_ISSUED';
  issuedDocuments: LivestockIssuedDocuments;
}

function fileToObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

function parseIssueInsuranceResponse(payload: unknown): IssueLivestockInsuranceResult {
  const data = unwrapEntityPayload(payload);
  const row =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : (payload as Record<string, unknown>);

  const issuedDocuments = (row.issuedDocuments ?? {}) as LivestockIssuedDocuments;

  return {
    status: 'INSURANCE_ISSUED',
    issuedDocuments,
  };
}

async function simulateIssueLivestockInsurance(
  applicationId: string,
  payload: IssueLivestockInsurancePayload,
): Promise<IssueLivestockInsuranceResult> {
  await simulateDelay();

  const issuedDocuments: LivestockIssuedDocuments = {
    contract: fileToObjectUrl(payload.contract),
    receipt: payload.receipt ? fileToObjectUrl(payload.receipt) : undefined,
  };

  const result: IssueLivestockInsuranceResult = {
    status: 'INSURANCE_ISSUED',
    issuedDocuments,
  };

  syncLivestockWorkflowCache(applicationId, result);
  return result;
}

/**
 * Issue livestock insurance / upload policy documents.
 * Backend: PUT `/issueLivestockInsurance/{id}` (multipart).
 */
export async function issueLivestockInsurance(
  apiFetch: ApiFetch,
  applicationId: string,
  payload: IssueLivestockInsurancePayload,
): Promise<IssueLivestockInsuranceResult> {
  if (!isLivestockWorkflowApiLive('issueInsurance')) {
    return simulateIssueLivestockInsurance(applicationId, payload);
  }

  const formData = new FormData();
  formData.append('contract', payload.contract, payload.contract.name);
  if (payload.receipt) formData.append('receipt', payload.receipt, payload.receipt.name);

  const response = await requestJson<unknown>(
    apiFetch,
    LIVESTOCK_ADMIN_ENDPOINTS.issueInsurance(applicationId),
    {
      method: 'PUT',
      body: formData,
    },
    'issue-insurance',
  );

  const result = parseIssueInsuranceResponse(response);
  syncLivestockWorkflowCache(applicationId, {
    status: result.status,
    issuedDocuments: result.issuedDocuments,
  });

  return result;
}
