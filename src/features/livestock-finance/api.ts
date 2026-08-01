'use client';

import { useCallback, useMemo, useState } from 'react';
import { useApiClient } from '@/utils/apiClient';
import { LIVESTOCK_FINANCE_ENDPOINTS } from './endpoints';
import { mockLivestockFinanceApi } from './mock-data';
import type {
  LivestockFinanceApplication,
  LivestockFinanceApplicationStatusFilter,
  LivestockFinanceDateRange,
  LivestockFinanceVetStats,
  LivestockFinanceVetTotals,
  LivestockPaidHistoryMonthBlock,
} from './domain';

const PAID_HISTORY_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function shouldFallbackToMock(response: Response | null, error: unknown): boolean {
  if (error) return true;
  if (!response) return true;
  return response.status === 404 || response.status >= 500;
}

function mapVetTotalsRow(row: Record<string, unknown>): LivestockFinanceVetTotals {
  const netPremium = Number(row.netPremium ?? row.totalInsurance ?? 0);
  const veterinaryCommission = Number(row.veterinaryCommission ?? row.agentCommission ?? 0);
  const solektraCommission = Number(
    row.solektraCommission ?? row.companyCommission ?? row.solektraShare ?? 0,
  );
  const totalCommission13_5 = Number(
    row.totalCommission13_5 ?? row.totalCommission ?? veterinaryCommission + solektraCommission,
  );

  const district =
    typeof row.district === 'string'
      ? row.district
      : typeof row.districts === 'string'
        ? row.districts
        : Array.isArray(row.districts) && typeof row.districts[0] === 'string'
          ? String(row.districts[0])
          : undefined;

  return {
    vetId: String(row.vetId ?? row._id ?? ''),
    name: String(row.fullName ?? row.name ?? '—'),
    email: typeof row.email === 'string' ? row.email : undefined,
    phoneNumber: typeof row.phoneNumber === 'string' ? row.phoneNumber : undefined,
    bankName: typeof row.bankName === 'string' ? row.bankName : undefined,
    bankAccountNumber:
      typeof row.bankAccountNumber === 'string' ? row.bankAccountNumber : undefined,
    netPremium,
    totalInsurance: Number(row.totalInsurance ?? netPremium),
    veterinaryCommission,
    solektraCommission,
    totalCommission13_5,
    applicationsCount: Number(row.applicationsCount ?? row.totalApplications ?? 0),
    district,
  };
}

function mapApplicationRow(raw: Record<string, unknown>): LivestockFinanceApplication {
  const client = (raw.client as Record<string, unknown> | undefined) ?? {};
  return {
    _id: String(raw._id ?? ''),
    applicationNumber: String(raw.applicationNumber ?? ''),
    status: typeof raw.status === 'string' ? raw.status : undefined,
    submittedAt: typeof raw.submittedAt === 'string' ? raw.submittedAt : undefined,
    vetId: typeof raw.vetId === 'string' ? raw.vetId : undefined,
    vetName:
      typeof raw.vetName === 'string'
        ? raw.vetName
        : typeof raw.fullName === 'string'
          ? raw.fullName
          : undefined,
    clientName:
      typeof raw.clientName === 'string'
        ? raw.clientName
        : typeof client.fullName === 'string'
          ? client.fullName
          : undefined,
    district:
      typeof raw.district === 'string'
        ? raw.district
        : typeof client.district === 'string'
          ? client.district
          : undefined,
    netPremium: Number(raw.netPremium ?? raw.amount ?? 0),
    veterinaryCommission: Number(raw.veterinaryCommission ?? 0),
    solektraCommission: Number(raw.solektraCommission ?? raw.companyCommission ?? 0),
    totalCommission: Number(
      raw.totalCommission ?? raw.totalCommission13_5 ?? 0,
    ),
  };
}

export function useLivestockFinanceApi() {
  const { apiFetch } = useApiClient();
  const [isPending, setIsPending] = useState(false);

  const getLivestockFinanceVetStats = useCallback(
    async (
      range: LivestockFinanceDateRange,
      applicationStatus: LivestockFinanceApplicationStatusFilter = 'READY_TO_BE_PAID',
    ): Promise<LivestockFinanceVetStats> => {
      setIsPending(true);
      try {
        let response: Response | null = null;
        try {
          response = await apiFetch(
            LIVESTOCK_FINANCE_ENDPOINTS.getLivestockFinanceVetStats({
              ...range,
              applicationStatus,
            }),
            { method: 'GET' },
          );
          if (shouldFallbackToMock(response, null)) {
            return mockLivestockFinanceApi.getLivestockFinanceVetStats(range, applicationStatus);
          }
          const payload = (await response.json()) as
            | LivestockFinanceVetStats
            | { data?: LivestockFinanceVetStats };
          const source: LivestockFinanceVetStats =
            payload && typeof payload === 'object' && 'data' in payload && payload.data
              ? payload.data
              : (payload as LivestockFinanceVetStats);
          return {
            totalCommission: Number(source?.totalCommission ?? 0),
            totalApplications: Number(source?.totalApplications ?? 0),
            totalVets: Number(source?.totalVets ?? 0),
            totalNetPremium: Number(source?.totalNetPremium ?? 0),
          };
        } catch (err) {
          if (shouldFallbackToMock(response, err)) {
            return mockLivestockFinanceApi.getLivestockFinanceVetStats(range, applicationStatus);
          }
          throw err;
        }
      } finally {
        setIsPending(false);
      }
    },
    [apiFetch],
  );

  const getVetsCommissionBreakdown = useCallback(
    async (
      range: LivestockFinanceDateRange,
      applicationStatus: LivestockFinanceApplicationStatusFilter = 'READY_TO_BE_PAID',
    ): Promise<LivestockFinanceVetTotals[]> => {
      setIsPending(true);
      try {
        let response: Response | null = null;
        try {
          response = await apiFetch(
            LIVESTOCK_FINANCE_ENDPOINTS.getVetsCommissionBreakdown({
              ...range,
              applicationStatus,
            }),
            { method: 'GET' },
          );
          if (shouldFallbackToMock(response, null)) {
            return mockLivestockFinanceApi.getVetsCommissionBreakdown(range, applicationStatus);
          }
          const payload = (await response.json()) as
            | Array<Record<string, unknown>>
            | { data?: Array<Record<string, unknown>> };
          const rows = Array.isArray(payload) ? payload : payload?.data ?? [];
          return rows.map(mapVetTotalsRow);
        } catch (err) {
          if (shouldFallbackToMock(response, err)) {
            return mockLivestockFinanceApi.getVetsCommissionBreakdown(range, applicationStatus);
          }
          throw err;
        }
      } finally {
        setIsPending(false);
      }
    },
    [apiFetch],
  );

  const getApplicationsByVetFinance = useCallback(
    async (
      vetId: string,
      range: LivestockFinanceDateRange,
      applicationStatus: LivestockFinanceApplicationStatusFilter = 'READY_TO_BE_PAID',
    ) => {
      setIsPending(true);
      try {
        let response: Response | null = null;
        try {
          response = await apiFetch(
            LIVESTOCK_FINANCE_ENDPOINTS.getApplicationsByVetFinance({
              vetId,
              ...range,
              applicationStatus,
            }),
            { method: 'GET' },
          );
          if (shouldFallbackToMock(response, null)) {
            return mockLivestockFinanceApi.getApplicationsByVetFinance(
              vetId,
              range,
              applicationStatus,
            );
          }
          const payload = (await response.json()) as {
            data?: Array<Record<string, unknown>>;
            totalApplications?: number;
            totalCommission?: number;
          };
          const applicationsMapped = (payload.data ?? []).map(mapApplicationRow);
          return {
            data: applicationsMapped,
            totalApplications: Number(payload.totalApplications ?? applicationsMapped.length),
            totalCommission: Number(payload.totalCommission ?? 0),
          };
        } catch (err) {
          if (shouldFallbackToMock(response, err)) {
            return mockLivestockFinanceApi.getApplicationsByVetFinance(
              vetId,
              range,
              applicationStatus,
            );
          }
          throw err;
        }
      } finally {
        setIsPending(false);
      }
    },
    [apiFetch],
  );

  const initiateLivestockPayment = useCallback(
    async (range: LivestockFinanceDateRange) => {
      setIsPending(true);
      try {
        let response: Response | null = null;
        try {
          response = await apiFetch(
            LIVESTOCK_FINANCE_ENDPOINTS.initiateLivestockPayment(range.startDate, range.endDate),
            { method: 'PUT' },
          );
          if (shouldFallbackToMock(response, null)) {
            mockLivestockFinanceApi.initiateLivestockPayment(range);
            return;
          }
          if (!response.ok) {
            let message = `Initiate payment failed (${response.status})`;
            try {
              const body = (await response.json()) as { error?: string; message?: string };
              if (typeof body?.error === 'string') message = body.error;
              else if (typeof body?.message === 'string') message = body.message;
            } catch {
              // ignore
            }
            throw new Error(message);
          }
        } catch (err) {
          if (shouldFallbackToMock(response, err)) {
            mockLivestockFinanceApi.initiateLivestockPayment(range);
            return;
          }
          throw err;
        }
      } finally {
        setIsPending(false);
      }
    },
    [apiFetch],
  );

  const markLivestockAsPaid = useCallback(
    async (range: LivestockFinanceDateRange) => {
      setIsPending(true);
      try {
        let response: Response | null = null;
        try {
          response = await apiFetch(
            LIVESTOCK_FINANCE_ENDPOINTS.markLivestockAsPaid(range.startDate, range.endDate),
            { method: 'PUT' },
          );
          if (shouldFallbackToMock(response, null)) {
            mockLivestockFinanceApi.markLivestockAsPaid(range);
            return;
          }
          if (!response.ok) {
            let message = `Mark as paid failed (${response.status})`;
            try {
              const body = (await response.json()) as { error?: string; message?: string };
              if (typeof body?.error === 'string') message = body.error;
              else if (typeof body?.message === 'string') message = body.message;
            } catch {
              // ignore
            }
            throw new Error(message);
          }
        } catch (err) {
          if (shouldFallbackToMock(response, err)) {
            mockLivestockFinanceApi.markLivestockAsPaid(range);
            return;
          }
          throw err;
        }
      } finally {
        setIsPending(false);
      }
    },
    [apiFetch],
  );

  const getLivestockPaidBatchesByYear = useCallback(
    async (year: number): Promise<LivestockPaidHistoryMonthBlock[]> => {
      setIsPending(true);
      try {
        let response: Response | null = null;
        try {
          response = await apiFetch(
            LIVESTOCK_FINANCE_ENDPOINTS.getLivestockPaidBatchesByYear(year),
            { method: 'GET' },
          );
          if (shouldFallbackToMock(response, null)) {
            return mockLivestockFinanceApi.getLivestockPaidBatchesByYear(year);
          }
          if (!response.ok) {
            throw new Error(`Failed to load paid batches (${response.status})`);
          }

          const payload = (await response.json()) as
            | Array<{
                month?: string;
                totalMonthPaid?: number;
                vets?: Array<{ vet?: Record<string, unknown>; totalPaid?: number }>;
              }>
            | {
                data?: Array<{
                  month?: string;
                  totalMonthPaid?: number;
                  vets?: Array<{ vet?: Record<string, unknown>; totalPaid?: number }>;
                }>;
              };

          const rawRows = Array.isArray(payload) ? payload : payload?.data ?? [];
          const byMonthName = new Map<
            string,
            { totalMonthPaid: number; vets: LivestockPaidHistoryMonthBlock['vets'] }
          >();

          for (const item of rawRows) {
            const rawMonth = String(item?.month ?? '').trim();
            if (!rawMonth) continue;
            const monthName =
              PAID_HISTORY_MONTH_NAMES.find((m) => m.toLowerCase() === rawMonth.toLowerCase()) ??
              rawMonth;
            if (!PAID_HISTORY_MONTH_NAMES.includes(monthName as (typeof PAID_HISTORY_MONTH_NAMES)[number])) {
              continue;
            }

            const vetEntries = Array.isArray(item.vets) ? item.vets : [];
            const vets = vetEntries.map((entry) => {
              const v = (entry?.vet ?? {}) as Record<string, unknown>;
              return {
                vetId: String(v._id ?? v.vetId ?? ''),
                name: String(v.fullName ?? v.name ?? ''),
                email: typeof v.email === 'string' ? v.email : undefined,
                phoneNumber: typeof v.phoneNumber === 'string' ? v.phoneNumber : undefined,
                bankName: typeof v.bankName === 'string' ? v.bankName : undefined,
                bankAccountNumber:
                  typeof v.bankAccountNumber === 'string' ? v.bankAccountNumber : undefined,
                totalPaid: Number(entry?.totalPaid ?? 0),
              };
            });

            byMonthName.set(monthName, {
              totalMonthPaid: Number(item?.totalMonthPaid ?? 0),
              vets,
            });
          }

          return PAID_HISTORY_MONTH_NAMES.map((monthName, idx) => {
            const block = byMonthName.get(monthName);
            return {
              monthIndex: idx + 1,
              monthName,
              totalMonthPaid: block?.totalMonthPaid ?? 0,
              vets: block?.vets ?? [],
            };
          });
        } catch (err) {
          if (shouldFallbackToMock(response, err)) {
            return mockLivestockFinanceApi.getLivestockPaidBatchesByYear(year);
          }
          throw err;
        }
      } finally {
        setIsPending(false);
      }
    },
    [apiFetch],
  );

  return useMemo(
    () => ({
      isPending,
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
      isPending,
      markLivestockAsPaid,
    ],
  );
}

export type { LivestockFinanceApplication };
