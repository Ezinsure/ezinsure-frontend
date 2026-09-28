'use client';

import { useCallback, useState } from 'react';
import {
  verifyLivestockPaymentProof,
  type VerifyLivestockPaymentPayload,
} from '@/features/livestock-application/api/payment-proof-api';
import { LivestockApiError } from '@/features/livestock-application/api/http';
import { humanizeLivestockApiError } from '@/features/livestock-application/api/error-messages';
import { useApiClient } from '@/utils/apiClient';

function toVerifyPaymentErrorMessage(err: unknown): string {
  if (err instanceof LivestockApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    return humanizeLivestockApiError(err.message, { context: 'payment-proof' });
  }
  return humanizeLivestockApiError(null, { context: 'payment-proof' });
}

export function useVerifyLivestockPaymentProof() {
  const { apiFetch } = useApiClient();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(
    async (applicationId: string, payload: VerifyLivestockPaymentPayload) => {
      setIsVerifying(true);
      setError(null);
      try {
        return await verifyLivestockPaymentProof(apiFetch, applicationId, payload);
      } catch (err) {
        const message = toVerifyPaymentErrorMessage(err);
        setError(message);
        throw new LivestockApiError(message, err instanceof LivestockApiError ? err.status : 0);
      } finally {
        setIsVerifying(false);
      }
    },
    [apiFetch],
  );

  return { verify, isVerifying, error, clearError: () => setError(null) };
}
