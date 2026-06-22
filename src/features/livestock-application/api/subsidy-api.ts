import type {
  GenerateSubsidyDocumentResponse,
  UploadSignedSubsidyPayload,
} from '@/features/livestock-application/domain/application-types';

const SUBSIDY_UNAVAILABLE =
  'Nkunganire document workflow is not yet available. Please contact support.';

/** Generate the nkunganire subsidy document for an application. */
export async function generateSubsidyDocument(
  _applicationId: string,
): Promise<GenerateSubsidyDocumentResponse> {
  throw new Error(SUBSIDY_UNAVAILABLE);
}

/** Upload a sector-signed nkunganire document. */
export async function uploadSignedSubsidyDocument(
  _applicationId: string,
  _payload: UploadSignedSubsidyPayload,
): Promise<{ subsidyCase: { status: string; uploadedSignedDocumentUrl: string } }> {
  throw new Error(SUBSIDY_UNAVAILABLE);
}
