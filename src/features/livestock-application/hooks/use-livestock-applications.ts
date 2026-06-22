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
  createLivestockApplicationsRepositoryForScope,
  isMockApplicationId,
  type LivestockApplicationsRepository,
  type LivestockListScope,
} from '@/features/livestock-application/api/livestock-applications.repository';
import { getCachedLivestockApplicationRow } from '@/features/livestock-application/api/livestock-application-session-cache';
import { mapToLivestockApplicationPackage } from '@/features/livestock-application/api/mappers';
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

export interface UseLivestockApplicationsListOptions {
  scope?: LivestockListScope;
  vetAgentId?: string;
}

function useLivestockRepository(
  scope: LivestockListScope,
  vetAgentId?: string,
): LivestockApplicationsRepository {
  const { apiFetch } = useApiClient();
  return useMemo(
    () => createLivestockApplicationsRepositoryForScope(apiFetch, scope, vetAgentId),
    [apiFetch, scope, vetAgentId],
  );
}

export function useLivestockApplicationsList(options: UseLivestockApplicationsListOptions = {}) {
  const scope = options.scope ?? 'vet';
  const vetAgentId = options.vetAgentId;
  const repository = useLivestockRepository(scope, vetAgentId);
  const [applications, setApplications] = useState<LivestockApplicationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (startDate: string, endDate: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await repository.list({
          agentId: vetAgentId,
          startDate,
          endDate,
          scope,
        });
        setApplications(res.data);
      } catch (err) {
        setError(toErrorMessage(err, 'Failed to load applications.'));
        setApplications([]);
      } finally {
        setIsLoading(false);
      }
    },
    [repository, scope, vetAgentId],
  );

  return { applications, isLoading, error, load, dataSource: repository.dataSource };
}

export interface UseLivestockApplicationDetailOptions {
  preferListCache?: boolean;
  scope?: LivestockListScope;
}

export function useLivestockApplicationDetail(
  applicationId: string,
  options?: UseLivestockApplicationDetailOptions,
) {
  const { user } = useAuth();
  const scope = options?.scope ?? 'vet';
  const repository = useLivestockRepository(
    scope,
    isMockApplicationId(applicationId) ? undefined : scope === 'vet' ? user?._id : undefined,
  );
  const [application, setApplication] = useState<LivestockApplicationPackage | null>(() => {
    if (!options?.preferListCache || typeof window === 'undefined') return null;
    const cached = getCachedLivestockApplicationRow(applicationId);
    return cached ? mapToLivestockApplicationPackage(cached) : null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (!options?.preferListCache || typeof window === 'undefined') return true;
    return !getCachedLivestockApplicationRow(applicationId);
  });
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await repository.getById({
        applicationId,
        agentId: scope === 'vet' ? user?._id : undefined,
        scope,
      });

      if (!data) setError('Application not found.');
      setApplication(data);
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load application.'));
      setApplication(null);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId, repository, scope, user?._id]);

  useEffect(() => {
    if (options?.preferListCache && getCachedLivestockApplicationRow(applicationId)) {
      return;
    }
    void reload();
  }, [applicationId, options?.preferListCache, reload]);

  return { application, isLoading, error, reload, dataSource: repository.dataSource };
}

export function useCreateLivestockApplication() {
  const { user } = useAuth();
  const repository = useLivestockRepository('vet', user?._id);
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
