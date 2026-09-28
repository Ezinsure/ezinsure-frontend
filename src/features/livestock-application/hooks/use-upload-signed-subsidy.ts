'use client';

import { useCallback, useState } from 'react';
import type { UploadSignedSubsidyPayload } from '@/features/livestock-application/domain/application-types';
import { uploadSignedSubsidyDocument } from '@/features/livestock-application/api/subsidy-api';
import { LivestockApiError } from '@/features/livestock-application/api/http';
import { humanizeLivestockApiError } from '@/features/livestock-application/api/error-messages';
import { useApiClient } from '@/utils/apiClient';

function toErrorMessage(err: unknown): string {
  if (err instanceof LivestockApiError) return err.message;
  if (err instanceof Error) return humanizeLivestockApiError(err.message, { context: 'subsidy-upload' });
  return humanizeLivestockApiError(null, { context: 'subsidy-upload' });
}

export function useUploadSignedSubsidyDocument() {
  const { apiFetch } = useApiClient();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (applicationId: string, payload: UploadSignedSubsidyPayload) => {
      setIsUploading(true);
      setError(null);
      try {
        return await uploadSignedSubsidyDocument(apiFetch, applicationId, payload);
      } catch (err) {
        const message = toErrorMessage(err);
        setError(message);
        throw new LivestockApiError(message, err instanceof LivestockApiError ? err.status : 0);
      } finally {
        setIsUploading(false);
      }
    },
    [apiFetch],
  );

  return { upload, isUploading, error, clearError: () => setError(null) };
}
