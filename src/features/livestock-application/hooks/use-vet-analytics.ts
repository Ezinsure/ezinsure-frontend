'use client';

import { useCallback, useMemo, useState } from 'react';
import type { LivestockApplicationListItem } from '@/features/livestock-application/domain/application-types';
import { LivestockApiError } from '@/features/livestock-application/api/http';
import { createLivestockApplicationsRepositoryForScope } from '@/features/livestock-application/api/livestock-applications.repository';
import { useApiClient } from '@/utils/apiClient';

/** Aggregated performance for a single veterinarian over the selected period. */
export interface VetPerformanceRow {
  vetKey: string;
  vetId?: string;
  vetName: string;
  totalApplications: number;
  totalInsuranceAmount: number;
  totalCommission: number;
  averageCommission: number;
  applications: LivestockApplicationListItem[];
}

export interface VetAnalyticsSummary {
  totalVets: number;
  totalApplications: number;
  totalInsuranceAmount: number;
  totalCommission: number;
  averageCommission: number;
}

const ANALYTICS_PAGE_SIZE = 200;
const MAX_PAGES = 100;

function toErrorMessage(err: unknown): string {
  if (err instanceof LivestockApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Failed to load veterinary analytics.';
}

function insuranceAmountFor(item: LivestockApplicationListItem): number {
  return Number(item.totalSumAssured ?? item.totals?.premiumRateAmount ?? 0);
}

function commissionFor(item: LivestockApplicationListItem): number {
  return Number(item.veterinaryCommission ?? 0);
}

export function useVetAnalytics() {
  const { apiFetch } = useApiClient();
  const repository = useMemo(
    () => createLivestockApplicationsRepositoryForScope(apiFetch, 'all'),
    [apiFetch],
  );

  const [applications, setApplications] = useState<LivestockApplicationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (startDate: string, endDate: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const collected: LivestockApplicationListItem[] = [];
        let pageNumber = 1;
        // Loop through every page so analytics reflect the whole date range.
        for (; pageNumber <= MAX_PAGES; pageNumber += 1) {
          const res = await repository.list({
            startDate,
            endDate,
            pageNumber,
            pageSize: ANALYTICS_PAGE_SIZE,
            scope: 'all',
          });
          collected.push(...res.data);
          if (res.data.length === 0 || pageNumber >= res.meta.totalPages) break;
        }
        setApplications(collected);
      } catch (err) {
        setError(toErrorMessage(err));
        setApplications([]);
      } finally {
        setIsLoading(false);
      }
    },
    [repository],
  );

  const vetRows = useMemo<VetPerformanceRow[]>(() => {
    const map = new Map<string, VetPerformanceRow>();

    for (const item of applications) {
      const name = item.vetName?.trim() || 'Unassigned veterinarian';
      const key = item.vetId?.trim() || name.toLowerCase();

      const existing =
        map.get(key) ??
        ({
          vetKey: key,
          vetId: item.vetId,
          vetName: name,
          totalApplications: 0,
          totalInsuranceAmount: 0,
          totalCommission: 0,
          averageCommission: 0,
          applications: [],
        } satisfies VetPerformanceRow);

      existing.totalApplications += 1;
      existing.totalInsuranceAmount += insuranceAmountFor(item);
      existing.totalCommission += commissionFor(item);
      existing.applications.push(item);

      map.set(key, existing);
    }

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        averageCommission:
          row.totalApplications > 0 ? row.totalCommission / row.totalApplications : 0,
        applications: [...row.applications].sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
        ),
      }))
      .sort((a, b) => b.totalCommission - a.totalCommission);
  }, [applications]);

  const summary = useMemo<VetAnalyticsSummary>(() => {
    const totalApplications = applications.length;
    const totalInsuranceAmount = applications.reduce((sum, i) => sum + insuranceAmountFor(i), 0);
    const totalCommission = applications.reduce((sum, i) => sum + commissionFor(i), 0);
    return {
      totalVets: vetRows.length,
      totalApplications,
      totalInsuranceAmount,
      totalCommission,
      averageCommission: totalApplications > 0 ? totalCommission / totalApplications : 0,
    };
  }, [applications, vetRows.length]);

  return { applications, vetRows, summary, isLoading, error, load };
}
