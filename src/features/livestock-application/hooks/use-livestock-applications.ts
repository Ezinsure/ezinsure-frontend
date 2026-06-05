'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchLivestockApplicationById,
  fetchLivestockApplications,
} from '@/features/livestock-application/api/applications-api';

export function useLivestockApplicationsList(vetId?: string) {
  const [applications, setApplications] = useState<Awaited<
    ReturnType<typeof fetchLivestockApplications>
  >['data']>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (startDate: string, endDate: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchLivestockApplications(vetId ?? 'demo-vet', startDate, endDate);
        setApplications(res.data);
      } catch {
        setError('Failed to load applications.');
      } finally {
        setIsLoading(false);
      }
    },
    [vetId],
  );

  return { applications, isLoading, error, load };
}

export function useLivestockApplicationDetail(applicationId: string) {
  const [application, setApplication] = useState<Awaited<
    ReturnType<typeof fetchLivestockApplicationById>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchLivestockApplicationById(applicationId);
      if (!data) setError('Application not found.');
      setApplication(data);
    } catch {
      setError('Failed to load application.');
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { application, isLoading, error, reload };
}
