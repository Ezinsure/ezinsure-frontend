import type {
  GenerateSubsidyDocumentResponse,
  UploadSignedSubsidyPayload,
} from '@/features/livestock-application/domain/application-types';

const SUBSIDY_UNAVAILABLE =
  'Nkunganire document workflow is not yet available. Please contact support.';

/** Generate the nkunganire subsidy document for an application. */
export async function generateSubsidyDocument(
  applicationId: string,
): Promise<GenerateSubsidyDocumentResponse> {
  void applicationId;
  throw new Error(SUBSIDY_UNAVAILABLE);
}

/** Upload a sector-signed nkunganire document. */
export async function uploadSignedSubsidyDocument(
  applicationId: string,
  payload: UploadSignedSubsidyPayload,
): Promise<{ subsidyCase: { status: string; uploadedSignedDocumentUrl: string } }> {
  void applicationId;
  void payload;
  throw new Error(SUBSIDY_UNAVAILABLE);
}
