'use client';

import { useCallback, useState } from 'react';
import {
  issueLivestockInsurance,
  type IssueLivestockInsurancePayload,
} from '@/features/livestock-application/api/insurance-issue-api';
import { LivestockApiError } from '@/features/livestock-application/api/http';
import { humanizeLivestockApiError } from '@/features/livestock-application/api/error-messages';
import { useApiClient } from '@/utils/apiClient';

function toErrorMessage(err: unknown): string {
  if (err instanceof LivestockApiError) return err.message;
  if (err instanceof Error) return humanizeLivestockApiError(err.message, { context: 'issue-insurance' });
  return humanizeLivestockApiError(null, { context: 'issue-insurance' });
}

export function useIssueLivestockInsurance() {
  const { apiFetch } = useApiClient();
  const [isIssuing, setIsIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issue = useCallback(
    async (applicationId: string, payload: IssueLivestockInsurancePayload) => {
      setIsIssuing(true);
      setError(null);
      try {
        return await issueLivestockInsurance(apiFetch, applicationId, payload);
      } catch (err) {
        const message = toErrorMessage(err);
        setError(message);
        throw new LivestockApiError(message, err instanceof LivestockApiError ? err.status : 0);
      } finally {
        setIsIssuing(false);
      }
    },
    [apiFetch],
  );

  return { issue, isIssuing, error, clearError: () => setError(null) };
}
