import type { UploadPaymentProofPayload } from '@/features/livestock-application/domain/application-types';
import { resolvePaymentProofFileType } from '@/features/livestock-application/api/error-messages';
import { LIVESTOCK_VET_ENDPOINTS } from '@/features/livestock-application/api/endpoints';
import type { ApiFetch } from '@/features/livestock-application/api/http';
import { requestJson, unwrapEntityPayload } from '@/features/livestock-application/api/http';
import { patchCachedLivestockApplicationRow } from '@/features/livestock-application/api/livestock-application-session-cache';
import { syncLivestockWorkflowCache } from '@/features/livestock-application/api/workflow-cache-sync';
import { patchLivestockWorkflowState } from '@/features/livestock-application/api/workflow-session';
import {
  isLivestockWorkflowApiLive,
} from '@/features/livestock-application/utils/workflow-demo-mode';

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

function simulateDelay(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 350);
  });
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
    status: String(row.status ?? 'PAYMENT_PROOF_SUBMITTED'),
    expectedAmount: Number(row.expectedAmount ?? row.amount ?? 0),
    documentUrl,
    transactionId: String(row.transactionId ?? ''),
  };
}

function applyPaymentProofUploadCache(
  applicationId: string,
  payload: UploadPaymentProofPayload,
  result: UploadPaymentProofResult,
): void {
  const submittedAt = new Date().toISOString();
  const documentUrl = result.documentUrl;
  const transactionId = result.transactionId || payload.transactionId;
  const files = payload.proofsOfPayment?.length
    ? payload.proofsOfPayment
    : payload.proofOfPayment
      ? [payload.proofOfPayment]
      : [];
  const documents = files.map((file, index) => ({
    documentUrl:
      index === 0 && documentUrl
        ? documentUrl
        : URL.createObjectURL(file),
    transactionId,
    notes: payload.notes?.trim() || undefined,
    submittedAt,
    fileName: file.name,
  }));

  patchLivestockWorkflowState(applicationId, {
    status: 'PAYMENT_PROOF_SUBMITTED',
    paymentProof: {
      status: 'SUBMITTED',
      expectedAmount: result.expectedAmount || payload.amount,
      documentUrl: documents[0]?.documentUrl ?? documentUrl,
      transactionId,
      notes: payload.notes?.trim() || undefined,
      submittedAt,
      documents,
    },
  });

  patchCachedLivestockApplicationRow(applicationId, {
    paidStatus: 'SUBMITTED',
    paymentProofStatus: 'SUBMITTED',
    status: 'PAYMENT_PROOF_SUBMITTED',
    ...(documentUrl ? { proofOfPayment: documentUrl } : {}),
    ...(transactionId ? { transactionId } : {}),
  });
}

async function simulateUploadLivestockPaymentProof(
  applicationId: string,
  payload: UploadPaymentProofPayload,
): Promise<UploadPaymentProofResult> {
  await simulateDelay();
  const files = payload.proofsOfPayment?.length
    ? payload.proofsOfPayment
    : payload.proofOfPayment
      ? [payload.proofOfPayment]
      : [];
  if (files.length === 0) {
    throw new Error('At least one payment proof file is required.');
  }
  void resolvePaymentProofFileType(files[0]);

  const documentUrl = URL.createObjectURL(files[0]);
  const result: UploadPaymentProofResult = {
    status: 'PAYMENT_PROOF_SUBMITTED',
    expectedAmount: payload.amount,
    documentUrl,
    transactionId: payload.transactionId,
  };

  applyPaymentProofUploadCache(applicationId, payload, result);
  return result;
}

export async function uploadLivestockPaymentProof(
  apiFetch: ApiFetch,
  applicationId: string,
  payload: UploadPaymentProofPayload,
): Promise<UploadPaymentProofResult> {
  if (!isLivestockWorkflowApiLive('uploadPaymentProof')) {
    return simulateUploadLivestockPaymentProof(applicationId, payload);
  }

  const files = payload.proofsOfPayment?.length
    ? payload.proofsOfPayment
    : payload.proofOfPayment
      ? [payload.proofOfPayment]
      : [];
  if (files.length === 0) {
    throw new Error('At least one payment proof file is required.');
  }

  const formData = new FormData();
  for (const file of files) {
    formData.append('proofsOfPayment', file, file.name || 'payment-proof');
    // Backward compatibility while backend migrates to array field.
    formData.append('proofOfPayment', file, file.name || 'payment-proof');
  }
  formData.append('amount', String(payload.amount));
  formData.append('transactionId', payload.transactionId.trim());
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
  syncLivestockWorkflowCache(applicationId, { status: result.status || 'PAYMENT_PROOF_SUBMITTED' });
  applyPaymentProofUploadCache(applicationId, payload, result);

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

async function simulateVerifyLivestockPaymentProof(
  applicationId: string,
  payload: VerifyLivestockPaymentPayload,
): Promise<VerifyLivestockPaymentResult> {
  await simulateDelay();
  void LIVESTOCK_VET_ENDPOINTS.verifyPayment(applicationId);

  if (payload.action === 'approve') {
    patchLivestockWorkflowState(applicationId, {
      status: 'PAYMENT_VERIFIED',
      paymentProof: {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
      },
    });
    patchCachedLivestockApplicationRow(applicationId, {
      status: 'PAYMENT_VERIFIED',
      paidStatus: 'VERIFIED',
      paymentProofStatus: 'VERIFIED',
    });
    return { status: 'PAYMENT_VERIFIED', paidStatus: 'VERIFIED' };
  }

  patchLivestockWorkflowState(applicationId, {
    status: 'PAYMENT_PROOF_REQUIRED',
    paymentProof: {
      status: 'REJECTED',
    },
  });
  patchCachedLivestockApplicationRow(applicationId, {
    status: 'PAYMENT_PROOF_REQUIRED',
    paidStatus: 'REJECTED',
    paymentProofStatus: 'REJECTED',
  });
  return { status: 'PAYMENT_PROOF_REQUIRED', paidStatus: 'REJECTED' };
}

export async function verifyLivestockPaymentProof(
  apiFetch: ApiFetch,
  applicationId: string,
  payload: VerifyLivestockPaymentPayload,
): Promise<VerifyLivestockPaymentResult> {
  if (!isLivestockWorkflowApiLive('verifyPaymentProof')) {
    return simulateVerifyLivestockPaymentProof(applicationId, payload);
  }

  const response = await requestJson<unknown>(
    apiFetch,
    LIVESTOCK_VET_ENDPOINTS.verifyPayment(applicationId),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: payload.action,
        ...(payload.action === 'reject'
          ? { reasonForPaymentRejection: payload.reasonForPaymentRejection?.trim() ?? '' }
          : {}),
      }),
    },
    'payment-proof',
  );

  const result = parseVerifyPaymentResponse(response);
  const nextStatus =
    result.status ||
    (payload.action === 'approve' ? 'PAYMENT_VERIFIED' : 'PAYMENT_PROOF_REQUIRED');
  const nextPaidStatus =
    result.paidStatus || (payload.action === 'approve' ? 'VERIFIED' : 'REJECTED');
  const paymentProofStatus = payload.action === 'approve' ? 'VERIFIED' : 'REJECTED';

  syncLivestockWorkflowCache(applicationId, { status: nextStatus });
  patchLivestockWorkflowState(applicationId, {
    paymentProof: {
      status: paymentProofStatus,
      ...(payload.action === 'approve' ? { verifiedAt: new Date().toISOString() } : {}),
    },
  });
  patchCachedLivestockApplicationRow(applicationId, {
    status: nextStatus,
    paidStatus: nextPaidStatus,
    paymentProofStatus,
  });

  return {
    status: nextStatus,
    paidStatus: nextPaidStatus,
  };
}
