'use client';

import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from '@/utils/apiClient';
import {
  fetchPerformanceCompare,
} from './api';
import type { PerformanceCompareAudience } from './types';
import type { LivestockListScope } from '@/features/livestock-application/api/livestock-applications.repository';
import type { PerformanceCompareResult } from './types';
import { getTodayIso } from './dates';

export function usePerformanceCompare(options: {
  audience: PerformanceCompareAudience;
  actorId?: string;
  livestockScope?: LivestockListScope;
  hideCompanyCommission?: boolean;
  /** When false, skip fetching (e.g. waiting for auth). */
  enabled?: boolean;
  asOf?: string;
}) {
  const { apiFetch } = useApiClient();
  const [data, setData] = useState<PerformanceCompareResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (options.enabled === false) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchPerformanceCompare(apiFetch, {
        audience: options.audience,
        asOf: options.asOf || getTodayIso(),
        actorId: options.actorId,
        livestockScope: options.livestockScope,
        hideCompanyCommission: options.hideCompanyCommission,
      });
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load performance compare',
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    apiFetch,
    options.actorId,
    options.asOf,
    options.audience,
    options.enabled,
    options.hideCompanyCommission,
    options.livestockScope,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, isLoading, error, reload: load };
}
