'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApiClient } from '@/utils/apiClient';
import {
  buildAgentMotorCompare,
  fetchPerformanceCompare,
  getMonthToDateCompareRanges,
  PerformanceCompareCards,
  type PerformanceCompareResult,
} from '@/features/performance-compare';

type RangeStats = {
  applications: number;
  clients: number;
  commission: number;
};

async function fetchAgentRangeStats(
  token: string,
  agentId: string,
  startDate: string,
  endDate: string,
): Promise<RangeStats> {
  const url = new URL(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/getRecentAgentApplications`,
  );
  url.searchParams.set('agentId', agentId);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    return { applications: 0, clients: 0, commission: 0 };
  }
  const payload = (await res.json().catch(() => ({}))) as {
    data?: Array<Record<string, unknown>>;
  };
  const rows = Array.isArray(payload.data) ? payload.data : [];
  const clients = new Set<string>();
  let commission = 0;
  for (const row of rows) {
    const client = row.client as { fullName?: string } | undefined;
    const name = String(
      client?.fullName ?? row.fullName ?? row.clientName ?? '',
    ).trim();
    if (name) clients.add(name.toLowerCase());
    commission += Number(row.agentCommission ?? row.commission ?? row.amount ?? 0) || 0;
  }
  return {
    applications: rows.length,
    clients: clients.size,
    commission,
  };
}

/**
 * Agent dashboard strip: month-to-date vs same period last month.
 */
export function AgentPerformanceCompareSection() {
  const { user, token } = useAuth();
  const { apiFetch } = useApiClient();
  const [data, setData] = useState<PerformanceCompareResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?._id || !token) return;
    setIsLoading(true);
    setError(null);
    const ranges = getMonthToDateCompareRanges();

    try {
      const fromApi = await fetchPerformanceCompare(apiFetch, {
        audience: 'agent',
        asOf: ranges.asOf,
        actorId: user._id,
      });
      if (fromApi.metrics.length) {
        setData(fromApi);
        return;
      }

      const [today, previous] = await Promise.all([
        fetchAgentRangeStats(
          token,
          user._id,
          ranges.currentStart,
          ranges.asOf,
        ),
        fetchAgentRangeStats(
          token,
          user._id,
          ranges.previousStart,
          ranges.previousAsOf,
        ),
      ]);

      setData(
        buildAgentMotorCompare({
          ...ranges,
          todayApplications: today.applications,
          previousApplications: previous.applications,
          todayClients: today.clients,
          previousClients: previous.clients,
          todayCommission: today.commission,
          previousCommission: previous.commission,
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
  }, [apiFetch, token, user?._id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user?._id) return null;

  return (
    <PerformanceCompareCards
      className="mb-6"
      data={data}
      isLoading={isLoading}
      error={error}
      scopeLabel="Your book"
      channelLabel="Motor"
    />
  );
}
