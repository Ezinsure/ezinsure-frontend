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
  fetchPerformanceCompare,
  getSameDayLastMonthIso,
  getTodayIso,
  PerformanceCompareCards,
  type PerformanceCompareResult,
} from '@/features/performance-compare';

type DayTotals = {
  applications: number;
  companyCommission: number;
  agentCommission: number;
  sonarwaBilling: number;
  clients: number;
};

async function fetchApplicationsForDay(
  token: string,
  day: string,
): Promise<number> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/countApplicationsThisMonth?startDate=${day}&endDate=${day}`,
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

async function fetchMotorDayTotals(
  token: string,
  day: string,
): Promise<DayTotals> {
  const [applications, commission, clients] = await Promise.all([
    fetchApplicationsForDay(token, day),
    fetchMonthlyCommissionSummary(token, day, day).catch(
      () => EMPTY_MONTHLY_COMMISSION_SUMMARY,
    ),
    fetchClientsForDay(token, day),
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
  previousAsOf: string;
  today: DayTotals;
  previous: DayTotals;
}): PerformanceCompareResult {
  return {
    asOf: input.asOf,
    previousAsOf: input.previousAsOf,
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
 * company-wide today vs same calendar day last month.
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
    const asOf = getTodayIso();
    const previousAsOf = getSameDayLastMonthIso(asOf);

    try {
      const fromApi = await fetchPerformanceCompare(apiFetch, {
        audience: 'admin',
        asOf,
        domain: 'motor',
      });
      if (fromApi.metrics.length && fromApi.fromApi) {
        setData(fromApi);
        return;
      }

      const [today, previous] = await Promise.all([
        fetchMotorDayTotals(token, asOf),
        fetchMotorDayTotals(token, previousAsOf),
      ]);

      setData(
        buildAdminMotorCompare({
          asOf,
          previousAsOf,
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
