'use client';

import { useCallback, useMemo, useState } from 'react';
import { LivestockApiError } from '@/features/livestock-application/api/http';
import {
  getVeterinaryPerformanceSummary,
  type VetPerformanceSummaryRow,
  type VetPerformanceSummaryTotals,
} from '@/features/livestock-application/api/vet-performance-api';
import { useApiClient } from '@/utils/apiClient';

/** Aggregated performance for a single veterinarian over the selected period. */
export interface VetPerformanceRow {
  vetKey: string;
  vetId?: string;
  vetName: string;
  veterinaryType?: string;
  totalApplications: number;
  totalInsuranceAmount: number;
  totalCommission: number;
  averageCommission: number;
}

export type VetAnalyticsSummary = VetPerformanceSummaryTotals;

function toErrorMessage(err: unknown): string {
  if (err instanceof LivestockApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Failed to load veterinary analytics.';
}

function mapRow(row: VetPerformanceSummaryRow): VetPerformanceRow {
  const vetKey = row.vetId?.trim() || row.vetName.trim().toLowerCase() || 'unassigned';
  return {
    vetKey,
    vetId: row.vetId,
    vetName: row.vetName,
    veterinaryType: row.veterinaryType,
    totalApplications: row.totalApplications,
    totalInsuranceAmount: row.totalInsuranceAmount,
    totalCommission: row.totalCommission,
    averageCommission: row.averageCommission,
  };
}

export function useVetAnalytics() {
  const { apiFetch } = useApiClient();

  const [vetRows, setVetRows] = useState<VetPerformanceRow[]>([]);
  const [summary, setSummary] = useState<VetAnalyticsSummary>({
    totalVets: 0,
    totalApplications: 0,
    totalInsuranceAmount: 0,
    totalCommission: 0,
    averageCommission: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<{ startDate: string; endDate: string } | null>(null);

  const load = useCallback(
    async (startDate: string, endDate: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getVeterinaryPerformanceSummary(apiFetch, startDate, endDate);
        setVetRows(response.data.map(mapRow));
        setSummary(response.summary);
        setPeriod({ startDate: response.meta.startDate, endDate: response.meta.endDate });
      } catch (err) {
        setError(toErrorMessage(err));
        setVetRows([]);
        setSummary({
          totalVets: 0,
          totalApplications: 0,
          totalInsuranceAmount: 0,
          totalCommission: 0,
          averageCommission: 0,
        });
        setPeriod({ startDate, endDate });
      } finally {
        setIsLoading(false);
      }
    },
    [apiFetch],
  );

  return useMemo(
    () => ({ vetRows, summary, isLoading, error, period, load }),
    [vetRows, summary, isLoading, error, period, load],
  );
}
