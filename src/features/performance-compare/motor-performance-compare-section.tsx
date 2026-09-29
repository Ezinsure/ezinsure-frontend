'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApiClient } from '@/utils/apiClient';
import {
  EMPTY_MONTHLY_COMMISSION_SUMMARY,
  fetchMonthlyCommissionSummary,
  getSonarwaBillingTotal,
} from '@/utils/monthly-commission-summary';
import {
  eachIsoDateInclusive,
  fetchPerformanceCompare,
  getMonthToDateCompareRanges,
  PerformanceCompareCards,
  type PerformanceCompareResult,
} from '@/features/performance-compare';

type RangeTotals = {
  applications: number;
  companyCommission: number;
  agentCommission: number;
  sonarwaBilling: number;
  clients: number;
};

async function fetchApplicationsForRange(
  token: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/countApplicationsThisMonth?startDate=${startDate}&endDate=${endDate}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!response.ok) return 0;
    const data = (await response.json()) as { data?: number };
    return Number(data.data) || 0;
  } catch {
    return 0;
  }
}

async function fetchClientsForDay(token: string, day: string): Promise<number> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/getDailyPerformanceMetrics?date=${day}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!response.ok) return 0;
    const result = (await response.json()) as {
      data?: Array<{ clients?: number }>;
    };
    const rows = Array.isArray(result.data) ? result.data : [];
    return rows.reduce((sum, row) => sum + (Number(row.clients) || 0), 0);
  } catch {
    return 0;
  }
}

/** Sum daily client metrics across an inclusive MTD window (API is day-scoped). */
async function fetchClientsForRange(
  token: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  const days = eachIsoDateInclusive(startDate, endDate);
  if (!days.length) return 0;
  const parts = await Promise.all(
    days.map((day) => fetchClientsForDay(token, day)),
  );
  return parts.reduce((sum, n) => sum + n, 0);
}

async function fetchMotorRangeTotals(
  token: string,
  startDate: string,
  endDate: string,
): Promise<RangeTotals> {
  const [applications, commission, clients] = await Promise.all([
    fetchApplicationsForRange(token, startDate, endDate),
    fetchMonthlyCommissionSummary(token, startDate, endDate).catch(
      () => EMPTY_MONTHLY_COMMISSION_SUMMARY,
    ),
    fetchClientsForRange(token, startDate, endDate),
  ]);

  return {
    applications,
    companyCommission: commission.totalCompanyCommission,
    agentCommission: commission.totalAgentCommission,
    sonarwaBilling: getSonarwaBillingTotal(commission),
    clients,
  };
}

function buildAdminMotorCompare(input: {
  asOf: string;
  currentStart: string;
  previousAsOf: string;
  previousStart: string;
  today: RangeTotals;
  previous: RangeTotals;
}): PerformanceCompareResult {
  return {
    asOf: input.asOf,
    currentStart: input.currentStart,
    previousAsOf: input.previousAsOf,
    previousStart: input.previousStart,
    audience: 'admin',
    fromApi: false,
    metrics: [
      {
        id: 'sonarwaBilling',
        label: 'SONARWA billing',
        kind: 'currency',
        current: input.today.sonarwaBilling,
        previous: input.previous.sonarwaBilling,
      },
      {
        id: 'companyCommission',
        label: 'Company commission',
        kind: 'currency',
        current: input.today.companyCommission,
        previous: input.previous.companyCommission,
      },
      {
        id: 'agentCommission',
        label: 'Agent commission',
        kind: 'currency',
        current: input.today.agentCommission,
        previous: input.previous.agentCommission,
      },
      {
        id: 'applications',
        label: 'Applications',
        kind: 'count',
        current: input.today.applications,
        previous: input.previous.applications,
      },
      {
        id: 'clients',
        label: 'New clients',
        kind: 'count',
        current: input.today.clients,
        previous: input.previous.clients,
      },
    ],
  };
}

/**
 * Admin / super admin / finance Motor dashboard:
 * company-wide month-to-date vs same period last month.
 */
export function MotorPerformanceCompareSection() {
  const { token } = useAuth();
  const { apiFetch } = useApiClient();
  const [data, setData] = useState<PerformanceCompareResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    const ranges = getMonthToDateCompareRanges();

    try {
      const fromApi = await fetchPerformanceCompare(apiFetch, {
        audience: 'admin',
        asOf: ranges.asOf,
        domain: 'motor',
      });
      if (fromApi.metrics.length && fromApi.fromApi) {
        setData(fromApi);
        return;
      }

      const [today, previous] = await Promise.all([
        fetchMotorRangeTotals(token, ranges.currentStart, ranges.asOf),
        fetchMotorRangeTotals(token, ranges.previousStart, ranges.previousAsOf),
      ]);

      setData(
        buildAdminMotorCompare({
          ...ranges,
          today,
          previous,
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load performance compare',
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!token) return null;

  return (
    <PerformanceCompareCards
      className="mb-8"
      data={data}
      isLoading={isLoading}
      error={error}
      scopeLabel="Company"
      channelLabel="Motor"
    />
  );
}
