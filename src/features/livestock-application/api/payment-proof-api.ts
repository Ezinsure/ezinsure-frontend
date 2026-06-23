import type { UploadPaymentProofPayload } from '@/features/livestock-application/domain/application-types';
import { resolvePaymentProofFileType } from '@/features/livestock-application/api/error-messages';
import { LIVESTOCK_VET_ENDPOINTS } from '@/features/livestock-application/api/endpoints';
import type { ApiFetch } from '@/features/livestock-application/api/http';
import { requestJson, unwrapEntityPayload } from '@/features/livestock-application/api/http';
import { patchCachedLivestockApplicationRow } from '@/features/livestock-application/api/livestock-application-session-cache';

export interface UploadPaymentProofResult {
  status: string;
  expectedAmount: number;
  documentUrl?: string;
  transactionId: string;
}

export interface VerifyLivestockPaymentPayload {
  action: 'approve' | 'reject';
  reasonForPaymentRejection?: string;
}

export interface VerifyLivestockPaymentResult {
  status: string;
  paidStatus?: string;
}

function parseUploadPaymentProofResponse(payload: unknown): UploadPaymentProofResult {
  const data = unwrapEntityPayload(payload);
  const row =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : (payload as Record<string, unknown>);

  const documentUrl = row.documentUrl
    ? String(row.documentUrl)
    : row.proofOfPayment
      ? String(row.proofOfPayment)
      : undefined;

  return {
    status: String(row.status ?? 'SUBMITTED'),
    expectedAmount: Number(row.expectedAmount ?? row.amount ?? 0),
    documentUrl,
    transactionId: String(row.transactionId ?? ''),
  };
}

export async function uploadLivestockPaymentProof(
  apiFetch: ApiFetch,
  applicationId: string,
  payload: UploadPaymentProofPayload,
): Promise<UploadPaymentProofResult> {
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
    ...(result.documentUrl ? { proofOfPayment: result.documentUrl } : {}),
    ...(result.transactionId ? { transactionId: result.transactionId } : {}),
  });

  return result;
}

function parseVerifyPaymentResponse(payload: unknown): VerifyLivestockPaymentResult {
  const data = unwrapEntityPayload(payload);
  const row =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : (payload as Record<string, unknown>);

  return {
    status: String(row.status ?? ''),
    paidStatus: row.paidStatus ? String(row.paidStatus) : undefined,
  };
}

export async function verifyLivestockPaymentProof(
  apiFetch: ApiFetch,
  applicationId: string,
  payload: VerifyLivestockPaymentPayload,
): Promise<VerifyLivestockPaymentResult> {
  const response = await requestJson<unknown>(
    apiFetch,
    LIVESTOCK_VET_ENDPOINTS.verifyPayment(applicationId),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: payload.action,
        ...(payload.action === 'reject' && payload.reasonForPaymentRejection
          ? { reasonForPaymentRejection: payload.reasonForPaymentRejection.trim() }
          : {}),
      }),
    },
    'payment-proof',
  );

  const result = parseVerifyPaymentResponse(response);

  if (payload.action === 'approve') {
    patchCachedLivestockApplicationRow(applicationId, {
      status: 'PAYMENT_VERIFIED',
      paidStatus: 'VERIFIED',
      paymentProofStatus: 'VERIFIED',
    });
  } else {
    patchCachedLivestockApplicationRow(applicationId, {
      status: 'PAYMENT_PROOF_REQUIRED',
      paidStatus: 'REJECTED',
      paymentProofStatus: 'REJECTED',
    });
  }

  return result;
}
