'use client';

import { useCallback, useState } from 'react';
import {
  reviewSonarwaSubsidy,
  type ReviewSonarwaSubsidyPayload,
} from '@/features/livestock-application/api/commission-workflow-api';
import { LivestockApiError } from '@/features/livestock-application/api/http';
import { humanizeLivestockApiError } from '@/features/livestock-application/api/error-messages';
import { useApiClient } from '@/utils/apiClient';

function toErrorMessage(err: unknown): string {
  if (err instanceof LivestockApiError) return err.message;
  if (err instanceof Error) return humanizeLivestockApiError(err.message, { context: 'sonarwa-review' });
  return humanizeLivestockApiError(null, { context: 'sonarwa-review' });
}

export function useReviewSonarwaSubsidy() {
  const { apiFetch } = useApiClient();
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const review = useCallback(
    async (applicationId: string, payload: ReviewSonarwaSubsidyPayload) => {
      setIsReviewing(true);
      setError(null);
      try {
        return await reviewSonarwaSubsidy(apiFetch, applicationId, payload);
      } catch (err) {
        const message = toErrorMessage(err);
        setError(message);
        throw new LivestockApiError(message, err instanceof LivestockApiError ? err.status : 0);
      } finally {
        setIsReviewing(false);
      }
    },
    [apiFetch],
  );

  return { review, isReviewing, error, clearError: () => setError(null) };
}
