/**
 * Livestock dashboard statistics API (admin / finance / super admin / vet).
 * Prefers `/getLivestockDashboardStats`; falls back to aggregating the applications list.
 */
import type { LivestockApplicationListItem } from '@/features/livestock-application/domain/application-types';
import type { ApiFetch } from '@/features/livestock-application/api/http';
import { requestJson, unwrapEntityPayload } from '@/features/livestock-application/api/http';
import {
  createLivestockApplicationsRepositoryForScope,
  type LivestockListScope,
} from '@/features/livestock-application/api/livestock-applications.repository';

export interface LivestockDashboardAnimalBreakdown {
  cows: number;
  pigs: number;
  chickens: number;
}

export interface LivestockDashboardStats {
  startDate: string;
  endDate: string;
  animalsInsured: LivestockDashboardAnimalBreakdown & { total: number };
  totalInsuredValue: number;
  totalAgentCommissions: number;
  totalCompanyCommissions: number;
  applicationsCount: number;
}

export const LIVESTOCK_DASHBOARD_ENDPOINTS = {
  /** GET — aggregated livestock dashboard stats for a date range. */
  stats: (startDate: string, endDate: string, vetId?: string): string => {
    const search = new URLSearchParams({ startDate, endDate });
    if (vetId) search.set('vetId', vetId);
    return `/getLivestockDashboardStats?${search.toString()}`;
  },
} as const;

function emptyStats(startDate: string, endDate: string): LivestockDashboardStats {
  return {
    startDate,
    endDate,
    animalsInsured: { cows: 0, pigs: 0, chickens: 0, total: 0 },
    totalInsuredValue: 0,
    totalAgentCommissions: 0,
    totalCompanyCommissions: 0,
    applicationsCount: 0,
  };
}

function aggregateFromApplications(
  applications: LivestockApplicationListItem[],
  startDate: string,
  endDate: string,
): LivestockDashboardStats {
  const stats = emptyStats(startDate, endDate);
  stats.applicationsCount = applications.length;

  for (const app of applications) {
    const lines = app.lineCount || 0;
    if (app.speciesGroup === 'CATTLE') stats.animalsInsured.cows += lines;
    else if (app.speciesGroup === 'PIG') stats.animalsInsured.pigs += lines;
    else if (app.speciesGroup === 'POULTRY') stats.animalsInsured.chickens += lines;

    stats.totalInsuredValue += Number(app.totalSumAssured ?? 0);
    stats.totalAgentCommissions += Number(app.veterinaryCommission ?? 0);
    const premium = Number(app.totals?.premiumRateAmount ?? 0);
    stats.totalCompanyCommissions += Math.round(premium * 0.08);
  }

  stats.animalsInsured.total =
    stats.animalsInsured.cows + stats.animalsInsured.pigs + stats.animalsInsured.chickens;
  return stats;
}

function parseDashboardStats(
  payload: unknown,
  startDate: string,
  endDate: string,
): LivestockDashboardStats | null {
  const data = unwrapEntityPayload(payload);
  const row = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  if (!row) return null;

  const animals =
    row.animalsInsured && typeof row.animalsInsured === 'object'
      ? (row.animalsInsured as Record<string, unknown>)
      : row;

  const cows = Number(animals.cows ?? animals.totalCows ?? 0);
  const pigs = Number(animals.pigs ?? animals.totalPigs ?? 0);
  const chickens = Number(animals.chickens ?? animals.totalChickens ?? 0);

  return {
    startDate: String(row.startDate ?? startDate),
    endDate: String(row.endDate ?? endDate),
    animalsInsured: {
      cows,
      pigs,
      chickens,
      total: Number(animals.total ?? cows + pigs + chickens),
    },
    totalInsuredValue: Number(row.totalInsuredValue ?? row.totalSumAssured ?? 0),
    totalAgentCommissions: Number(
      row.totalAgentCommissions ?? row.totalVeterinaryCommission ?? 0,
    ),
    totalCompanyCommissions: Number(
      row.totalCompanyCommissions ?? row.totalSolektraCommission ?? 0,
    ),
    applicationsCount: Number(row.applicationsCount ?? row.totalApplications ?? 0),
  };
}

export async function fetchLivestockDashboardStats(
  apiFetch: ApiFetch,
  options: {
    startDate: string;
    endDate: string;
    scope: LivestockListScope;
    vetId?: string;
    hideCompanyCommission?: boolean;
  },
): Promise<LivestockDashboardStats> {
  const { startDate, endDate, scope, vetId, hideCompanyCommission } = options;

  try {
    const response = await requestJson<unknown>(
      apiFetch,
      LIVESTOCK_DASHBOARD_ENDPOINTS.stats(startDate, endDate, vetId),
      { method: 'GET' },
      'livestock-dashboard',
    );
    const parsed = parseDashboardStats(response, startDate, endDate);
    if (parsed) {
      if (hideCompanyCommission) parsed.totalCompanyCommissions = 0;
      return parsed;
    }
  } catch {
    // Fall through until backend endpoint is live.
  }

  const repository = createLivestockApplicationsRepositoryForScope(apiFetch, scope);
  const list = await repository.list({
    agentId: vetId,
    startDate,
    endDate,
    pageSize: 200,
    pageNumber: 1,
    scope,
  });

  const stats = aggregateFromApplications(list.data, startDate, endDate);
  if (hideCompanyCommission) stats.totalCompanyCommissions = 0;
  return stats;
}
