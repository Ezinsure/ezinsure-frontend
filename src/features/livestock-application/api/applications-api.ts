import type {
  CreateLivestockApplicationPayload,
  GenerateSubsidyDocumentResponse,
  LivestockApplicationPackage,
  LivestockApplicationsListResponse,
  UploadPaymentProofPayload,
  UploadSignedSubsidyPayload,
} from '@/features/livestock-application/domain/application-types';
import {
  getMockApplicationDetail,
  getMockApplicationsList,
  updateMockApplication,
} from '@/features/livestock-application/api/mock-store';

const MOCK_DELAY_MS = 600;

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function objectUrlFromFile(file: File): string {
  return URL.createObjectURL(file);
}

/** GET /livestock/applications — vetId optional for admin (all apps) */
export async function fetchLivestockApplications(
  vetId: string | undefined,
  startDate: string,
  endDate: string,
): Promise<LivestockApplicationsListResponse> {
  await delay();
  void vetId;
  const all = getMockApplicationsList();
  return {
    data: all.filter((app) => {
      const d = app.submittedAt.slice(0, 10);
      return d >= startDate && d <= endDate;
    }),
    meta: { total: all.length, startDate, endDate },
  };
}

/** GET /livestock/applications/:id */
export async function fetchLivestockApplicationById(
  applicationId: string,
): Promise<LivestockApplicationPackage | null> {
  await delay();
  return getMockApplicationDetail(applicationId);
}

/** POST /livestock/applications */
export async function createLivestockApplication(
  payload: CreateLivestockApplicationPayload,
): Promise<{ _id: string; applicationNumber: string; status: string }> {
  await delay(900);
  console.log('[API stub] POST /livestock/applications', payload);
  return {
    _id: `mock-app-${Date.now()}`,
    applicationNumber: `LS-2026-${String(Math.floor(Math.random() * 900) + 100).padStart(5, '0')}`,
    status: 'SUBMITTED',
  };
}

/**
 * POST /livestock/applications/:id/payment-proof
 * Motor equivalent: PUT /sendProofofPayment/:id with FormData(proofOfPayment, transactionId)
 */
export async function uploadPaymentProof(
  applicationId: string,
  payload: UploadPaymentProofPayload,
): Promise<{ status: string; expectedAmount: number; documentUrl: string; transactionId: string }> {
  await delay(800);
  const formData = new FormData();
  formData.append('proofOfPayment', payload.proofOfPayment);
  formData.append('transactionId', payload.transactionId);
  formData.append('amount', String(payload.amount));
  if (payload.notes) formData.append('notes', payload.notes);
  console.log('[API stub] POST payment-proof multipart', applicationId, {
    transactionId: payload.transactionId,
    amount: payload.amount,
    fileName: payload.proofOfPayment.name,
    fileSize: payload.proofOfPayment.size,
  });

  const documentUrl = objectUrlFromFile(payload.proofOfPayment);
  const now = new Date().toISOString();
  updateMockApplication(applicationId, {
    status: 'PAYMENT_PROOF_SUBMITTED',
    paymentProof: {
      status: 'SUBMITTED',
      expectedAmount: payload.amount,
      documentUrl,
      transactionId: payload.transactionId,
      submittedAt: now,
    },
  });

  return {
    status: 'SUBMITTED',
    expectedAmount: payload.amount,
    documentUrl,
    transactionId: payload.transactionId,
  };
}

/** POST /livestock/applications/:id/subsidy/generate-document */
export async function generateSubsidyDocument(
  applicationId: string,
): Promise<GenerateSubsidyDocumentResponse> {
  await delay();
  const documentUrl =
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  console.log('[API stub] POST subsidy/generate-document', applicationId);
  updateMockApplication(applicationId, {
    subsidyCase: {
      required: true,
      status: 'DOC_GENERATED',
      generatedDocumentUrl: documentUrl,
    },
  });
  return {
    documentUrl,
    templateVersion: 'nkunganire-v1-placeholder',
  };
}

/** POST /livestock/applications/:id/subsidy/upload-signed */
export async function uploadSignedSubsidyDocument(
  applicationId: string,
  payload: UploadSignedSubsidyPayload,
): Promise<{ subsidyCase: { status: string; uploadedSignedDocumentUrl: string } }> {
  await delay(800);
  const formData = new FormData();
  formData.append('signedDocument', payload.signedDocument);
  formData.append('signedBy', payload.signedBy);
  if (payload.notes) formData.append('notes', payload.notes);
  console.log('[API stub] POST subsidy/upload-signed multipart', applicationId, {
    signedBy: payload.signedBy,
    fileName: payload.signedDocument.name,
  });

  const uploadedSignedDocumentUrl = objectUrlFromFile(payload.signedDocument);
  const statusMap = {
    SECTOR: 'SECTOR_SIGNED',
    VET: 'VET_SIGNED',
    SONARWA: 'SONARWA_APPROVED',
  } as const;
  const status = statusMap[payload.signedBy];

  const current = getMockApplicationDetail(applicationId);
  if (!current) throw new Error('Application not found');

  updateMockApplication(applicationId, {
    subsidyCase: {
      ...current.subsidyCase,
      status,
      uploadedSignedDocumentUrl,
      sectorSignedAt:
        payload.signedBy === 'SECTOR' ? new Date().toISOString() : current.subsidyCase.sectorSignedAt,
    },
  });

  return { subsidyCase: { status, uploadedSignedDocumentUrl } };
}
