'use client';

import { useCallback, useState } from 'react';
import { LIVESTOCK_LIST_DEFAULT_PAGE_SIZE } from '@/features/livestock-application/api/endpoints';
import type { SonarwaReviewScope } from '@/features/livestock-application/api/endpoints';
import { LivestockApiError } from '@/features/livestock-application/api/http';
import type { LivestockApplicationListItem } from '@/features/livestock-application/domain/application-types';
import { listSonarwaLivestockApplications } from '@/features/sonarwa-portal/api/sonarwa-applications-api';
import { useApiClient } from '@/utils/apiClient';

export interface SonarwaApplicationsListMeta {
  total: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

const EMPTY_META: SonarwaApplicationsListMeta = {
  total: 0,
  pageNumber: 1,
  pageSize: LIVESTOCK_LIST_DEFAULT_PAGE_SIZE,
  totalPages: 1,
};

function toErrorMessage(err: unknown): string {
  if (err instanceof LivestockApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Failed to load SONARWA applications.';
}

export function useSonarwaApplicationsList(initialPageSize?: number) {
  const { apiFetch } = useApiClient();
  const [applications, setApplications] = useState<LivestockApplicationListItem[]>([]);
  const [meta, setMeta] = useState<SonarwaApplicationsListMeta>(EMPTY_META);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize ?? LIVESTOCK_LIST_DEFAULT_PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (
      startDate: string,
      endDate: string,
      nextPageNumber: number,
      nextPageSize: number,
      reviewScope: SonarwaReviewScope,
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await listSonarwaLivestockApplications(apiFetch, {
          startDate,
          endDate,
          pageNumber: nextPageNumber,
          pageSize: nextPageSize,
          reviewScope,
        });
        setApplications(res.data);
        setMeta({
          total: res.meta.total,
          pageNumber: res.meta.pageNumber,
          pageSize: res.meta.pageSize,
          totalPages: res.meta.totalPages,
        });
        setPageNumber(res.meta.pageNumber);
        setPageSize(res.meta.pageSize);
      } catch (err) {
        setError(toErrorMessage(err));
        setApplications([]);
        setMeta(EMPTY_META);
      } finally {
        setIsLoading(false);
      }
    },
    [apiFetch],
  );

  return {
    applications,
    meta,
    pageNumber,
    pageSize,
    isLoading,
    error,
    load,
  };
}
