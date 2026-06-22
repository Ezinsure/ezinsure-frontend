import type { UploadPaymentProofPayload } from '@/features/livestock-application/domain/application-types';
import { resolvePaymentProofFileType } from '@/features/livestock-application/api/error-messages';
import { LIVESTOCK_VET_ENDPOINTS } from '@/features/livestock-application/api/endpoints';
import { uploadPaymentProof as uploadPaymentProofMock } from '@/features/livestock-application/api/applications-api';
import type { ApiFetch } from '@/features/livestock-application/api/http';
import { requestJson, unwrapEntityPayload } from '@/features/livestock-application/api/http';
import { isMockApplicationId } from '@/features/livestock-application/api/livestock-applications.repository';
import { patchCachedLivestockApplicationRow } from '@/features/livestock-application/api/livestock-application-session-cache';

export interface UploadPaymentProofResult {
  status: string;
  expectedAmount: number;
  documentUrl?: string;
  transactionId: string;
}

function parseUploadPaymentProofResponse(payload: unknown): UploadPaymentProofResult {
  const data = unwrapEntityPayload(payload);
  const row =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : (payload as Record<string, unknown>);

  return {
    status: String(row.status ?? 'SUBMITTED'),
    expectedAmount: Number(row.expectedAmount ?? row.amount ?? 0),
    documentUrl: row.documentUrl ? String(row.documentUrl) : undefined,
    transactionId: String(row.transactionId ?? ''),
  };
}

/** PUT /uploadProofOfPayment/:id — multipart/form-data (vet only). */
export async function uploadLivestockPaymentProof(
  apiFetch: ApiFetch,
  applicationId: string,
  payload: UploadPaymentProofPayload,
): Promise<UploadPaymentProofResult> {
  if (isMockApplicationId(applicationId)) {
    return uploadPaymentProofMock(applicationId, payload);
  }

  const formData = new FormData();
  const file = payload.proofOfPayment;
  formData.append('proofOfPayment', file, file.name || 'payment-proof');
  formData.append('transactionId', payload.transactionId);
  formData.append('amount', String(payload.amount));
  formData.append('fileType', resolvePaymentProofFileType(file));
  if (payload.notes?.trim()) {
    formData.append('notes', payload.notes.trim());
  }

  const response = await requestJson<unknown>(
    apiFetch,
    LIVESTOCK_VET_ENDPOINTS.uploadProofOfPayment(applicationId),
    {
      method: 'PUT',
      body: formData,
    },
    'payment-proof',
  );

  const result = parseUploadPaymentProofResponse(response);

  patchCachedLivestockApplicationRow(applicationId, {
    paidStatus: 'SUBMITTED',
    paymentProofStatus: 'SUBMITTED',
    status: 'PAYMENT_PROOF_SUBMITTED',
  });

  return result;
}
