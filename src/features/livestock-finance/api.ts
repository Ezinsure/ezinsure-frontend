'use client';

import { useCallback, useMemo } from 'react';
import { FINANCE_MOCK_ENABLED } from '@/config/finance';
import { useApiClient } from '@/utils/apiClient';
import { LIVESTOCK_FINANCE_ENDPOINTS } from './endpoints';
import {
  mapApplicationRow,
  mapPaidHistoryYear,
  mapVetTotalsRow,
  unwrapObject,
  unwrapRows,
} from './mappers';
import type {
  LivestockFinanceApplication,
  LivestockFinanceApplicationStatusFilter,
  LivestockFinanceDateRange,
  LivestockFinanceVetStats,
  LivestockFinanceVetTotals,
  LivestockPaidHistoryMonthBlock,
} from './domain';

type ApiFetch = ReturnType<typeof useApiClient>['apiFetch'];

/** Demo data is opt-in (NEXT_PUBLIC_FINANCE_MOCK=true) and loaded lazily. */
const loadMock = () => import('./mock-data').then((m) => m.mockLivestockFinanceApi);

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown; message?: unknown };
    if (typeof body?.error === 'string') return body.error;
    if (typeof body?.message === 'string') return body.message;
  } catch {
    // Body is not JSON; use the fallback below.
  }
  return `${fallback} (${response.status})`;
}

async function request(
  apiFetch: ApiFetch,
  path: string,
  method: 'GET' | 'PUT',
  failureLabel: string,
): Promise<Response> {
  const response = await apiFetch(path, { method });
  if (!response.ok) throw new Error(await readErrorMessage(response, failureLabel));
  return response;
}

const getJson = async (apiFetch: ApiFetch, path: string, failureLabel: string) =>
  (await request(apiFetch, path, 'GET', failureLabel)).json() as Promise<unknown>;

type VetFinanceApplications = {
  data: LivestockFinanceApplication[];
  totalApplications: number;
  totalCommission: number;
};

export function useLivestockFinanceApi() {
  const { apiFetch } = useApiClient();

  // Keep callbacks stable. Do not toggle React state inside these methods —
  // that recreates the returned `api` object and re-triggers view effects
  // that depend on it (infinite fetch loop).

  const getLivestockFinanceVetStats = useCallback(
    async (
      range: LivestockFinanceDateRange,
      applicationStatus: LivestockFinanceApplicationStatusFilter = 'READY_TO_BE_PAID',
    ): Promise<LivestockFinanceVetStats> => {
      if (FINANCE_MOCK_ENABLED) {
        return (await loadMock()).getLivestockFinanceVetStats(range, applicationStatus);
      }
      const payload = await getJson(
        apiFetch,
        LIVESTOCK_FINANCE_ENDPOINTS.getLivestockFinanceVetStats({ ...range, applicationStatus }),
        'Failed to load finance stats',
      );
      const source = unwrapObject<LivestockFinanceVetStats>(payload);
      return {
        totalCommission: Number(source.totalCommission ?? 0),
        totalApplications: Number(source.totalApplications ?? 0),
        totalVets: Number(source.totalVets ?? 0),
        totalNetPremium: Number(source.totalNetPremium ?? 0),
      };
    },
    [apiFetch],
  );

  const getVetsCommissionBreakdown = useCallback(
    async (
      range: LivestockFinanceDateRange,
      applicationStatus: LivestockFinanceApplicationStatusFilter = 'READY_TO_BE_PAID',
    ): Promise<LivestockFinanceVetTotals[]> => {
      if (FINANCE_MOCK_ENABLED) {
        return (await loadMock()).getVetsCommissionBreakdown(range, applicationStatus);
      }
      const payload = await getJson(
        apiFetch,
        LIVESTOCK_FINANCE_ENDPOINTS.getVetsCommissionBreakdown({ ...range, applicationStatus }),
        'Failed to load vet commissions',
      );
      return unwrapRows(payload).map(mapVetTotalsRow);
    },
    [apiFetch],
  );

  const getApplicationsByVetFinance = useCallback(
    async (
      vetId: string,
      range: LivestockFinanceDateRange,
      applicationStatus: LivestockFinanceApplicationStatusFilter = 'READY_TO_BE_PAID',
    ): Promise<VetFinanceApplications> => {
      if (FINANCE_MOCK_ENABLED) {
        return (await loadMock()).getApplicationsByVetFinance(vetId, range, applicationStatus);
      }
      const payload = await getJson(
        apiFetch,
        LIVESTOCK_FINANCE_ENDPOINTS.getApplicationsByVetFinance({
          vetId,
          ...range,
          applicationStatus,
        }),
        'Failed to load vet applications',
      );
      const summary = (payload ?? {}) as {
        totalApplications?: number;
        totalCommission?: number;
      };
      const data = unwrapRows(payload).map(mapApplicationRow);
      return {
        data,
        totalApplications: Number(summary.totalApplications ?? data.length),
        totalCommission: Number(summary.totalCommission ?? 0),
      };
    },
    [apiFetch],
  );

  const initiateLivestockPayment = useCallback(
    async (range: LivestockFinanceDateRange): Promise<void> => {
      if (FINANCE_MOCK_ENABLED) {
        (await loadMock()).initiateLivestockPayment(range);
        return;
      }
      await request(
        apiFetch,
        LIVESTOCK_FINANCE_ENDPOINTS.initiateLivestockPayment(range.startDate, range.endDate),
        'PUT',
        'Initiate payment failed',
      );
    },
    [apiFetch],
  );

  const markLivestockAsPaid = useCallback(
    async (range: LivestockFinanceDateRange): Promise<void> => {
      if (FINANCE_MOCK_ENABLED) {
        (await loadMock()).markLivestockAsPaid(range);
        return;
      }
      await request(
        apiFetch,
        LIVESTOCK_FINANCE_ENDPOINTS.markLivestockAsPaid(range.startDate, range.endDate),
        'PUT',
        'Mark as paid failed',
      );
    },
    [apiFetch],
  );

  const getLivestockPaidBatchesByYear = useCallback(
    async (year: number): Promise<LivestockPaidHistoryMonthBlock[]> => {
      if (FINANCE_MOCK_ENABLED) {
        return (await loadMock()).getLivestockPaidBatchesByYear(year);
      }
      const payload = await getJson(
        apiFetch,
        LIVESTOCK_FINANCE_ENDPOINTS.getLivestockPaidBatchesByYear(year),
        'Failed to load paid batches',
      );
      return mapPaidHistoryYear(payload);
    },
    [apiFetch],
  );

  return useMemo(
    () => ({
      getLivestockFinanceVetStats,
      getVetsCommissionBreakdown,
      getApplicationsByVetFinance,
      initiateLivestockPayment,
      markLivestockAsPaid,
      getLivestockPaidBatchesByYear,
    }),
    [
      getApplicationsByVetFinance,
      getLivestockFinanceVetStats,
      getLivestockPaidBatchesByYear,
      getVetsCommissionBreakdown,
      initiateLivestockPayment,
      markLivestockAsPaid,
    ],
  );
}

export type { LivestockFinanceApplication };
