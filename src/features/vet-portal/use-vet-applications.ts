'use client';

import { useCallback, useState } from 'react';
import { getVeterinaryApplications } from '@/features/livestock-vet-import/api';
import type { VeterinaryApplication } from '@/features/vet-portal/types';
import { useApiClient } from '@/utils/apiClient';

export function useVetApplications(agentId: string | undefined) {
  const { apiFetch } = useApiClient();
  const [applications, setApplications] = useState<VeterinaryApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(
    async (startDate: string, endDate: string) => {
      if (!agentId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await getVeterinaryApplications(apiFetch, {
          agentId,
          startDate,
          endDate,
        });
        setApplications(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load applications';
        setError(message);
        setApplications([]);
      } finally {
        setIsLoading(false);
      }
    },
    [agentId, apiFetch],
  );

  return { applications, isLoading, error, fetchApplications };
}
