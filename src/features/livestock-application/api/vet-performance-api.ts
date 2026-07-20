import { LIVESTOCK_ADMIN_ENDPOINTS } from '@/features/livestock-application/api/endpoints';
import type { ApiFetch } from '@/features/livestock-application/api/http';
import { requestJson, unwrapEntityPayload } from '@/features/livestock-application/api/http';

export interface VetPerformanceSummaryTotals {
  totalVets: number;
  totalApplications: number;
  totalInsuranceAmount: number;
  totalCommission: number;
  averageCommission: number;
}

export interface VetPerformanceSummaryRow {
  vetId?: string;
  vetName: string;
  veterinaryType?: string;
  totalApplications: number;
  totalInsuranceAmount: number;
  totalCommission: number;
  averageCommission: number;
}

export interface VetPerformanceSummaryResponse {
  meta: { startDate: string; endDate: string };
  summary: VetPerformanceSummaryTotals;
  data: VetPerformanceSummaryRow[];
}

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function mapRow(raw: Record<string, unknown>): VetPerformanceSummaryRow {
  const totalApplications = asNumber(
    raw.totalApplications ?? raw.applicationCount ?? raw.applicationsCount,
  );
  const totalCommission = asNumber(
    raw.totalCommission ?? raw.veterinaryCommission ?? raw.commission,
  );
  const totalInsuranceAmount = asNumber(
    raw.totalInsuranceAmount ?? raw.totalSumAssured ?? raw.insuredValue,
  );
  const averageCommission = asNumber(
    raw.averageCommission ??
      (totalApplications > 0 ? totalCommission / totalApplications : 0),
  );

  const vetId = asString(raw.vetId ?? raw.agentId ?? raw._id) || undefined;
  const vetName =
    asString(raw.vetName ?? raw.fullName ?? raw.agentName) || 'Unassigned veterinarian';

  return {
    vetId,
    vetName,
    veterinaryType: asString(raw.veterinaryType) || undefined,
    totalApplications,
    totalInsuranceAmount,
    totalCommission,
    averageCommission,
  };
}

function extractRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object');
  }
  if (!payload || typeof payload !== 'object') return [];

  const root = payload as Record<string, unknown>;
  const candidates = [root.data, root.vets, root.rows, root.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (row): row is Record<string, unknown> => !!row && typeof row === 'object',
      );
    }
  }
  return [];
}

function extractSummary(
  payload: unknown,
  rows: VetPerformanceSummaryRow[],
): VetPerformanceSummaryTotals {
  const root =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const summaryRaw =
    root.summary && typeof root.summary === 'object'
      ? (root.summary as Record<string, unknown>)
      : root;

  const totalApplications =
    asNumber(summaryRaw.totalApplications) ||
    rows.reduce((sum, row) => sum + row.totalApplications, 0);
  const totalInsuranceAmount =
    asNumber(summaryRaw.totalInsuranceAmount) ||
    rows.reduce((sum, row) => sum + row.totalInsuranceAmount, 0);
  const totalCommission =
    asNumber(summaryRaw.totalCommission) ||
    rows.reduce((sum, row) => sum + row.totalCommission, 0);
  const totalVets = asNumber(summaryRaw.totalVets) || rows.length;
  const averageCommission =
    asNumber(summaryRaw.averageCommission) ||
    (totalApplications > 0 ? totalCommission / totalApplications : 0);

  return {
    totalVets,
    totalApplications,
    totalInsuranceAmount,
    totalCommission,
    averageCommission,
  };
}

/**
 * Backend: GET `/getVeterinaryPerformanceSummary?startDate=&endDate=`
 * Used by admin / finance / super_admin vet analytics.
 */
export async function getVeterinaryPerformanceSummary(
  apiFetch: ApiFetch,
  startDate: string,
  endDate: string,
): Promise<VetPerformanceSummaryResponse> {
  const payload = await requestJson<unknown>(
    apiFetch,
    LIVESTOCK_ADMIN_ENDPOINTS.veterinaryPerformanceSummary(startDate, endDate),
    { method: 'GET' },
    'general',
  );

  const unwrapped = unwrapEntityPayload(payload);
  const rows = extractRows(unwrapped ?? payload).map(mapRow);
  const summary = extractSummary(unwrapped ?? payload, rows);

  return {
    meta: { startDate, endDate },
    summary,
    data: rows.sort((a, b) => b.totalCommission - a.totalCommission),
  };
}
