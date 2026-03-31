'use client';

import { useCallback, useMemo, useState } from 'react';
import { useFinanceMock } from './finance-mock-provider';
import type { FinanceAgentTotals, FinanceApplication, FinanceDateRange, FinanceMonthYear } from './finance-domain';
import { toMonthYear } from './finance-dummy-data';
import { useApiClient } from '@/utils/apiClient';

// This file is the "API contract layer" for the finance UI.
//
// Backend endpoints to implement (these match the data the UI renders):
//
// 1) Dashboard (accruals / ready-to-be-paid)
//   - GET /finance/accruals/agent-totals?startMonth&startYear&endMonth&endYear
//     -> FinanceAgentTotals[]
//   - GET /finance/accruals/applications-by-agent?agentId&startMonth&startYear&endMonth&endYear
//     -> FinanceApplication[]
//
// 2) Payment initiated (snapshot)
//   - GET /finance/payment-initiated/batches
//     -> { batches: FinanceBatchSummary[] }
//   - GET /finance/payment-initiated/agent-totals?month&year
//     -> FinanceAgentTotals[]
//   - GET /finance/payment-initiated/applications-by-agent?agentId&month&year
//     -> FinanceApplication[] (must include snapshot commission fields)
//   - GET /finance/payment-initiated/application-details?id
//     -> FinanceApplication (must be snapshot-frozen)
//
// 3) Payment history (paid snapshots)
//   - GET /finance/payment-history/batches?year=YYYY
//   - GET /finance/payment-history/agent-totals?month&year
//   - GET /finance/payment-history/applications-by-agent?agentId&month&year
//   - GET /finance/payment-history/application-details?id
//
// 4) Actions
//   - PUT /finance/initiate-payment?startMonth&startYear&endMonth&endYear
//   - PUT /finance/mark-batch-paid?batchId
//
// For now, this module uses a local dummy store.

export function useFinanceApi() {
  const { agents, applications, state, actions } = useFinanceMock();
  const { apiFetch } = useApiClient();
  const [isPending, setIsPending] = useState(false);

  const monthRange = useCallback((startDate: string, endDate: string): FinanceMonthYear[] => {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);
    const months: FinanceMonthYear[] = [];
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return months;

    // Normalize order
    const s = start <= end ? start : end;
    const e = start <= end ? end : start;

    const cur = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1));
    const last = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 1));
    while (cur.getTime() <= last.getTime()) {
      const month = cur.getUTCMonth() + 1;
      const year = cur.getUTCFullYear();
      months.push(toMonthYear(month, year));
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
    return months;
  }, []);

  const getAccrualAgentTotals = useCallback(
    async (
      range: FinanceDateRange,
      applicationStatus: 'PAID' | 'READY_TO_BE_PAID' | 'ALL' = 'READY_TO_BE_PAID',
    ): Promise<FinanceAgentTotals[]> => {
      setIsPending(true);
      try {
        const months = monthRange(range.startDate, range.endDate);
        const eligibleApps = applications.filter((a) => {
          const d = a.submittedAt ? new Date(a.submittedAt) : null;
          if (!d || Number.isNaN(d.getTime())) return false;
          if (applicationStatus !== 'ALL' && a.status?.toUpperCase() !== applicationStatus) return false;
          return months.some((m) => m.month === d.getUTCMonth() + 1 && m.year === d.getUTCFullYear());
        });

        const byAgent = new Map<string, { total: number; count: number }>();
        for (const app of eligibleApps) {
          const agentId = app.agentId || '';
          if (!agentId) continue;
          const cur = byAgent.get(agentId) ?? { total: 0, count: 0 };
          cur.total += Number(app.agentCommission ?? 0);
          cur.count += 1;
          byAgent.set(agentId, cur);
        }

        return agents
          .map((agent) => {
            const bucket = byAgent.get(agent.agentId);
            return {
              ...agent,
              totalCommission: bucket?.total ?? 0,
              applicationsCount: bucket?.count ?? 0,
            };
          })
          .filter((row) => row.applicationsCount > 0)
          .sort((a, b) => b.totalCommission - a.totalCommission);
      } finally {
        setIsPending(false);
      }
    },
    [agents, applications, monthRange],
  );

  const getAccrualApplicationsByAgent = useCallback(
    async (agentId: string, range: FinanceDateRange): Promise<FinanceApplication[]> => {
      setIsPending(true);
      try {
        const months = monthRange(range.startDate, range.endDate);
        const eligibleApps = applications.filter((a) => {
          const d = a.submittedAt ? new Date(a.submittedAt) : null;
          if (!d || Number.isNaN(d.getTime())) return false;
          if (a.status?.toUpperCase() !== 'READY_TO_BE_PAID') return false;
          const matchesMonth = months.some((m) => m.month === d.getUTCMonth() + 1 && m.year === d.getUTCFullYear());
          return matchesMonth && (a.agentId ?? '') === agentId;
        });
        return eligibleApps.sort(
          (a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime(),
        );
      } finally {
        setIsPending(false);
      }
    },
    [applications, monthRange],
  );

  const getInitiatedBatches = useCallback(async () => {
    setIsPending(true);
    try {
      const batches = state.initiatedBatches
        .map((b) => ({
          id: b.id,
          monthYear: toMonthYear(b.month, b.year),
          status: b.paid ? ('PAID' as const) : ('INITIATED' as const),
          createdAt: b.createdAt,
          markedPaidAt: b.paid ? b.createdAt : undefined,
          applicationIds: b.applicationIds,
        }))
        .sort((a, c) => {
          const aDate = new Date(a.monthYear.year, a.monthYear.month - 1).getTime();
          const cDate = new Date(c.monthYear.year, c.monthYear.month - 1).getTime();
          return cDate - aDate;
        });
      return batches;
    } finally {
      setIsPending(false);
    }
  }, [state.initiatedBatches]);

  const getInitiatedAgentTotals = useCallback(
    async (month: number, year: number): Promise<FinanceAgentTotals[]> => {
      setIsPending(true);
      try {
        const batch = state.initiatedBatches.find((b) => b.month === month && b.year === year);
        if (!batch) return [];

        const appById = new Map(applications.map((a) => [a._id, a]));
        const eligibleApps = batch.applicationIds.map((id) => appById.get(id)).filter(Boolean) as FinanceApplication[];

        const byAgent = new Map<string, { total: number; count: number }>();
        for (const app of eligibleApps) {
          const agentId = app.agentId ?? '';
          if (!agentId) continue;
          const snapshot = batch.snapshotsByApplicationId[app._id];
          const v = Number(snapshot?.agentCommissionSnapshot ?? app.agentCommission ?? 0);
          const cur = byAgent.get(agentId) ?? { total: 0, count: 0 };
          cur.total += v;
          cur.count += 1;
          byAgent.set(agentId, cur);
        }

        return agents
          .map((agent) => {
            const bucket = byAgent.get(agent.agentId);
            return { ...agent, totalCommission: bucket?.total ?? 0, applicationsCount: bucket?.count ?? 0 };
          })
          .filter((row) => row.applicationsCount > 0)
          .sort((a, b) => b.totalCommission - a.totalCommission);
      } finally {
        setIsPending(false);
      }
    },
    [agents, applications, state.initiatedBatches],
  );

  const getInitiatedApplicationsByAgent = useCallback(
    async (agentId: string, month: number, year: number): Promise<FinanceApplication[]> => {
      setIsPending(true);
      try {
        const batch = state.initiatedBatches.find((b) => b.month === month && b.year === year);
        if (!batch) return [];
        const appById = new Map(applications.map((a) => [a._id, a]));
        const apps = batch.applicationIds.map((id) => appById.get(id)).filter(Boolean) as FinanceApplication[];
        const filtered = apps.filter((a) => (a.agentId ?? '') === agentId);
        return filtered
          .map((a) => {
            const snap = batch.snapshotsByApplicationId[a._id];
            return {
              ...a,
              agentCommissionSnapshot: snap?.agentCommissionSnapshot,
              companyCommissionSnapshot: snap?.companyCommissionSnapshot,
              administrationFeesSnapshot: snap?.administrationFeesSnapshot,
              agentCommission: snap?.agentCommissionSnapshot,
            };
          })
          .sort((a, b) => new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime());
      } finally {
        setIsPending(false);
      }
    },
    [applications, state.initiatedBatches],
  );

  const getApplicationDetails = useCallback(
    async (applicationId: string, context: 'accrual' | 'initiated' | 'paid', month?: number, year?: number) => {
      // Backend endpoint contract:
      // - accrual: GET /finance/accruals/application-details?id=...
      // - initiated: GET /finance/payment-initiated/application-details?id=...
      // - paid: GET /finance/payment-history/application-details?id=...
      setIsPending(true);
      try {
        const app = applications.find((a) => a._id === applicationId);
        if (!app) return null;
        if (context === 'initiated' || context === 'paid') {
          const batch = month != null && year != null ? state.initiatedBatches.find((b) => b.month === month && b.year === year) : null;
          if (batch) {
            const snap = batch.snapshotsByApplicationId[applicationId];
            return {
              ...app,
              agentCommissionSnapshot: snap?.agentCommissionSnapshot,
              companyCommissionSnapshot: snap?.companyCommissionSnapshot,
              administrationFeesSnapshot: snap?.administrationFeesSnapshot,
              agentCommission: snap?.agentCommissionSnapshot,
            };
          }
        }
        return app;
      } finally {
        setIsPending(false);
      }
    },
    [applications, state.initiatedBatches],
  );

  const initiatePaymentForRange = useCallback(
    async (range: FinanceDateRange) => {
      const months = monthRange(range.startDate, range.endDate);
      await actions.initiatePaymentForMonths(months);
    },
    [actions, monthRange],
  );

  const markBatchPaid = useCallback(
    async (batchId: string) => {
      await actions.markBatchAsPaid(batchId);
    },
    [actions],
  );

  const getFinanceAgentStats = useCallback(
    async (range: FinanceDateRange, applicationStatus: 'PAID' | 'READY_TO_BE_PAID' | 'ALL' = 'READY_TO_BE_PAID') => {
      const params = new URLSearchParams({
        startDate: range.startDate,
        endDate: range.endDate,
        applicationStatus,
      });

      const response = await apiFetch(`/getFinanceAgentStats?${params.toString()}`, {
        method: 'GET',
      });

      return response.json();
    },
    [apiFetch],
  );

  return useMemo(
    () => ({
      isPending,
      getAccrualAgentTotals,
      getAccrualApplicationsByAgent,
      getInitiatedBatches,
      getInitiatedAgentTotals,
      getInitiatedApplicationsByAgent,
      getApplicationDetails,
      initiatePaymentForRange,
      markBatchPaid,
      getFinanceAgentStats,
    }),
    [
      getAccrualAgentTotals,
      getAccrualApplicationsByAgent,
      getApplicationDetails,
      getInitiatedAgentTotals,
      getInitiatedApplicationsByAgent,
      getInitiatedBatches,
      initiatePaymentForRange,
      isPending,
      markBatchPaid,
      getFinanceAgentStats,
    ],
  );
}

