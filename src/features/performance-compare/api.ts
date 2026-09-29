import type { ApiFetch } from '@/features/livestock-application/api/http';
import { requestJson, unwrapEntityPayload } from '@/features/livestock-application/api/http';
import {
  fetchLivestockDashboardStats,
  type LivestockDashboardStats,
} from '@/features/livestock-application/api/dashboard-stats-api';
import type { LivestockListScope } from '@/features/livestock-application/api/livestock-applications.repository';
import {
  getMonthStartIso,
  getMonthToDateCompareRanges,
  getTodayIso,
} from './dates';
import type {
  PerformanceCompareAudience,
  PerformanceCompareMetric,
  PerformanceCompareMetricKind,
  PerformanceCompareResult,
} from './types';

export type { PerformanceCompareAudience };

export const PERFORMANCE_COMPARE_ENDPOINTS = {
  /**
   * Preferred dedicated endpoint (MTD semantics).
   * Query: asOf (YYYY-MM-DD end of current window), optional audience / actorId.
   * Backend should return month-to-date totals for asOf vs same day last month.
   */
  compare: (params: {
    asOf: string;
    audience: PerformanceCompareAudience;
    actorId?: string;
  }): string => {
    const search = new URLSearchParams({
      asOf: params.asOf,
      audience: params.audience,
      mode: 'mtd',
    });
    if (params.actorId) search.set('actorId', params.actorId);
    return `/getPerformanceCompare?${search.toString()}`;
  },
} as const;

function metricsFromLivestockStats(
  current: LivestockDashboardStats,
  previous: LivestockDashboardStats,
  options: { hideCompanyCommission?: boolean; vetScoped?: boolean },
): PerformanceCompareMetric[] {
  const metrics: PerformanceCompareMetric[] = [
    {
      id: 'applications',
      label: 'Applications',
      kind: 'count',
      current: current.applicationsCount,
      previous: previous.applicationsCount,
    },
    {
      id: 'animals',
      label: 'Animals insured',
      kind: 'count',
      current: current.animalsInsured.total,
      previous: previous.animalsInsured.total,
    },
    {
      id: 'insuredValue',
      label: 'Insured value',
      kind: 'currency',
      current: current.totalInsuredValue,
      previous: previous.totalInsuredValue,
    },
    {
      id: 'agentCommission',
      label: options.vetScoped ? 'Your commission' : 'Agent commission',
      kind: 'currency',
      current: current.totalAgentCommissions,
      previous: previous.totalAgentCommissions,
    },
  ];

  if (!options.hideCompanyCommission) {
    metrics.push({
      id: 'companyCommission',
      label: 'Company commission',
      kind: 'currency',
      current: current.totalCompanyCommissions,
      previous: previous.totalCompanyCommissions,
    });
  }

  return metrics;
}

function parseApiCompare(
  payload: unknown,
  fallback: PerformanceCompareResult,
): PerformanceCompareResult | null {
  const data = unwrapEntityPayload(payload);
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const metricsRaw = row.metrics;
  if (!Array.isArray(metricsRaw) || metricsRaw.length === 0) return null;

  const metrics: PerformanceCompareMetric[] = metricsRaw
    .map((item, index): PerformanceCompareMetric | null => {
      const m = (item ?? {}) as Record<string, unknown>;
      const kindRaw = String(m.kind ?? 'number');
      const kind: PerformanceCompareMetricKind =
        kindRaw === 'currency' || kindRaw === 'count' || kindRaw === 'number'
          ? kindRaw
          : 'number';
      const label = String(m.label ?? m.name ?? `Metric ${index + 1}`);
      if (!label.trim()) return null;
      return {
        id: String(m.id ?? m.key ?? `metric-${index}`),
        label,
        kind,
        current: Number(m.current ?? m.today ?? m.value ?? 0) || 0,
        previous: Number(m.previous ?? m.lastMonthToday ?? m.prior ?? 0) || 0,
      };
    })
    .filter((m): m is PerformanceCompareMetric => m != null);

  if (!metrics.length) return null;

  const asOf = String(row.asOf ?? row.today ?? fallback.asOf);
  const previousAsOf = String(
    row.previousAsOf ?? row.lastMonthToday ?? fallback.previousAsOf,
  );

  return {
    asOf,
    currentStart: String(
      row.currentStart ?? row.currentPeriodStart ?? getMonthStartIso(asOf),
    ),
    previousAsOf,
    previousStart: String(
      row.previousStart ??
        row.previousPeriodStart ??
        getMonthStartIso(previousAsOf),
    ),
    audience: fallback.audience,
    metrics,
    fromApi: true,
  };
}

async function fetchLivestockFallback(
  apiFetch: ApiFetch,
  options: {
    asOf: string;
    currentStart: string;
    previousAsOf: string;
    previousStart: string;
    audience: PerformanceCompareAudience;
    scope: LivestockListScope;
    vetId?: string;
    hideCompanyCommission?: boolean;
  },
): Promise<PerformanceCompareResult> {
  const [current, previous] = await Promise.all([
    fetchLivestockDashboardStats(apiFetch, {
      startDate: options.currentStart,
      endDate: options.asOf,
      scope: options.scope,
      vetId: options.vetId,
      hideCompanyCommission: options.hideCompanyCommission,
    }),
    fetchLivestockDashboardStats(apiFetch, {
      startDate: options.previousStart,
      endDate: options.previousAsOf,
      scope: options.scope,
      vetId: options.vetId,
      hideCompanyCommission: options.hideCompanyCommission,
    }),
  ]);

  return {
    asOf: options.asOf,
    currentStart: options.currentStart,
    previousAsOf: options.previousAsOf,
    previousStart: options.previousStart,
    audience: options.audience,
    metrics: metricsFromLivestockStats(current, previous, {
      hideCompanyCommission: options.hideCompanyCommission,
      vetScoped: Boolean(options.vetId),
    }),
    fromApi: false,
  };
}

/**
 * Load month-to-date vs prior-month MTD metrics.
 * Prefers `/getPerformanceCompare`; falls back to livestock stats over ranges.
 */
export async function fetchPerformanceCompare(
  apiFetch: ApiFetch,
  options: {
    audience: PerformanceCompareAudience;
    asOf?: string;
    actorId?: string;
    /** Livestock list scope when falling back. */
    livestockScope?: LivestockListScope;
    hideCompanyCommission?: boolean;
    /**
     * When `motor`, do not fall back to livestock day stats
     * (caller supplies motor-specific fallback).
     */
    domain?: 'motor' | 'livestock';
  },
): Promise<PerformanceCompareResult> {
  const ranges = getMonthToDateCompareRanges(options.asOf || getTodayIso());
  const base: PerformanceCompareResult = {
    ...ranges,
    audience: options.audience,
    metrics: [],
    fromApi: false,
  };

  try {
    const payload = await requestJson<unknown>(
      apiFetch,
      PERFORMANCE_COMPARE_ENDPOINTS.compare({
        asOf: ranges.asOf,
        audience: options.audience,
        actorId: options.actorId,
      }),
      { method: 'GET' },
      'livestock-dashboard',
    );
    const parsed = parseApiCompare(payload, base);
    if (parsed) return parsed;
  } catch {
    // Fall through until backend ships the compare endpoint.
  }

  if (options.audience === 'agent' || options.domain === 'motor') {
    // Motor / agent callers build their own fallback metrics.
    return base;
  }

  const scope = options.livestockScope ?? (options.audience === 'vet' ? 'vet' : 'all');
  return fetchLivestockFallback(apiFetch, {
    ...ranges,
    audience: options.audience,
    scope,
    vetId: options.audience === 'vet' ? options.actorId : undefined,
    hideCompanyCommission: options.hideCompanyCommission ?? options.audience === 'vet',
  });
}

/**
 * Build agent (motor) compare metrics from two MTD-scoped application lists.
 */
export function buildAgentMotorCompare(input: {
  asOf: string;
  currentStart: string;
  previousAsOf: string;
  previousStart: string;
  todayApplications: number;
  previousApplications: number;
  todayCommission: number;
  previousCommission: number;
  todayClients: number;
  previousClients: number;
}): PerformanceCompareResult {
  return {
    asOf: input.asOf,
    currentStart: input.currentStart,
    previousAsOf: input.previousAsOf,
    previousStart: input.previousStart,
    audience: 'agent',
    fromApi: false,
    metrics: [
      {
        id: 'applications',
        label: 'Applications',
        kind: 'count',
        current: input.todayApplications,
        previous: input.previousApplications,
      },
      {
        id: 'clients',
        label: 'Clients served',
        kind: 'count',
        current: input.todayClients,
        previous: input.previousClients,
      },
      {
        id: 'commission',
        label: 'Commission',
        kind: 'currency',
        current: input.todayCommission,
        previous: input.previousCommission,
      },
    ],
  };
}
