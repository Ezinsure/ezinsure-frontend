'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CreateLivestockApplicationPayload,
  LivestockApplicationListItem,
  LivestockApplicationPackage,
} from '@/features/livestock-application/domain/application-types';
import type { CreateApplicationResult } from '@/features/livestock-application/api/backend-types';
import { LivestockApiError } from '@/features/livestock-application/api/http';
import {
  createLivestockRepositoryForVet,
  isMockApplicationId,
  type LivestockApplicationsRepository,
} from '@/features/livestock-application/api/livestock-applications.repository';
import { useAuth } from '@/context/AuthContext';
import { useApiClient } from '@/utils/apiClient';

export type CreateLivestockApplicationSubmitResult =
  | { success: true; data: CreateApplicationResult }
  | { success: false; error: string };

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof LivestockApiError) {
    if (Array.isArray(err.details) && err.details.length > 0) {
      return `${err.message}: ${err.details.join('; ')}`;
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function useLivestockRepository(vetAgentId?: string): LivestockApplicationsRepository {
  const { apiFetch } = useApiClient();
  return useMemo(
    () => createLivestockRepositoryForVet(apiFetch, vetAgentId),
    [apiFetch, vetAgentId],
  );
}

export function useLivestockApplicationsList(vetAgentId?: string) {
  const repository = useLivestockRepository(vetAgentId);
  const [applications, setApplications] = useState<LivestockApplicationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (startDate: string, endDate: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await repository.list({
          agentId: vetAgentId ?? '',
          startDate,
          endDate,
        });
        setApplications(res.data);
      } catch (err) {
        setError(toErrorMessage(err, 'Failed to load applications.'));
        setApplications([]);
      } finally {
        setIsLoading(false);
      }
    },
    [repository, vetAgentId],
  );

  return { applications, isLoading, error, load, dataSource: repository.dataSource };
}

export function useLivestockApplicationDetail(applicationId: string) {
  const { user } = useAuth();
  const repository = useLivestockRepository(isMockApplicationId(applicationId) ? undefined : user?._id);
  const [application, setApplication] = useState<LivestockApplicationPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await repository.getById({
        applicationId,
        agentId: user?._id,
      });

      if (!data) setError('Application not found.');
      setApplication(data);
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load application.'));
      setApplication(null);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId, repository, user?._id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { application, isLoading, error, reload, dataSource: repository.dataSource };
}

export function useCreateLivestockApplication() {
  const { user } = useAuth();
  const repository = useLivestockRepository(user?._id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (
      payload: CreateLivestockApplicationPayload,
    ): Promise<CreateLivestockApplicationSubmitResult> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const data = await repository.create(payload);
        return { success: true, data };
      } catch (err) {
        const message = toErrorMessage(err, 'Failed to submit application.');
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsSubmitting(false);
      }
    },
    [repository],
  );

  return { submit, isSubmitting, error, clearError: () => setError(null) };
}
