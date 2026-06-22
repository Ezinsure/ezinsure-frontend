'use client';

import { useCallback, useState } from 'react';
import type { UploadPaymentProofPayload } from '@/features/livestock-application/domain/application-types';
import { uploadLivestockPaymentProof } from '@/features/livestock-application/api/payment-proof-api';
import { LivestockApiError } from '@/features/livestock-application/api/http';
import { humanizeLivestockApiError } from '@/features/livestock-application/api/error-messages';
import { useApiClient } from '@/utils/apiClient';

function toPaymentProofErrorMessage(err: unknown): string {
  if (err instanceof LivestockApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    return humanizeLivestockApiError(err.message, { context: 'payment-proof' });
  }
  return humanizeLivestockApiError(null, { context: 'payment-proof' });
}

export function useUploadLivestockPaymentProof() {
  const { apiFetch } = useApiClient();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (applicationId: string, payload: UploadPaymentProofPayload) => {
      setIsUploading(true);
      setError(null);
      try {
        return await uploadLivestockPaymentProof(apiFetch, applicationId, payload);
      } catch (err) {
        const message = toPaymentProofErrorMessage(err);
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
