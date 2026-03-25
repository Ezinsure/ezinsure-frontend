'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { FinanceMonthYear } from './finance-domain';
import { dummyAgents, dummyApplications, dummyInitiatedSeedBatches } from './finance-dummy-data';

type StoredSnapshot = {
  agentCommissionSnapshot: number;
  companyCommissionSnapshot: number;
  administrationFeesSnapshot: number;
};

type StoredBatch = {
  id: string;
  month: number;
  year: number;
  createdAt: string;
  paid: boolean;
  applicationIds: string[];
  snapshotsByApplicationId: Record<string, StoredSnapshot>;
};

type FinanceMockState = {
  initiatedBatches: StoredBatch[];
};

type FinanceMockContextValue = {
  agents: typeof dummyAgents;
  applications: typeof dummyApplications;
  state: FinanceMockState;
  actions: {
    initiatePaymentForMonths: (months: FinanceMonthYear[]) => Promise<void>;
    markBatchAsPaid: (batchId: string) => Promise<void>;
  };
};

const FinanceMockContext = createContext<FinanceMockContextValue | null>(null);

function buildInitialStoredState(): FinanceMockState {
  const seeded = dummyInitiatedSeedBatches.map((seed) => {
    const snapshotsByApplicationId: Record<string, StoredSnapshot> = {};
    for (const appId of seed.applicationIds) {
      const app = dummyApplications.find((a) => a._id === appId);
      snapshotsByApplicationId[appId] = {
        agentCommissionSnapshot: Number(app?.agentCommission ?? 0),
        companyCommissionSnapshot: Number(app?.companyCommission ?? 0),
        administrationFeesSnapshot: Number(app?.administrationFees ?? 0),
      };
    }
    return {
      id: seed.id,
      month: seed.month,
      year: seed.year,
      createdAt: seed.createdAt,
      paid: seed.paid,
      applicationIds: seed.applicationIds,
      snapshotsByApplicationId,
    } satisfies StoredBatch;
  });

  return { initiatedBatches: seeded };
}

function monthKey(m: FinanceMonthYear) {
  return `${m.year}-${String(m.month).padStart(2, '0')}`;
}

export function FinanceMockProvider({ children }: { children: React.ReactNode }) {
  const storageKey = 'finance_mock_state_v1';

  const [state, setState] = useState<FinanceMockState>(() => {
    if (typeof window === 'undefined') return buildInitialStoredState();
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return buildInitialStoredState();
      const parsed = JSON.parse(raw) as FinanceMockState;
      if (!parsed?.initiatedBatches) return buildInitialStoredState();
      return parsed;
    } catch {
      return buildInitialStoredState();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const initiatePaymentForMonths = useCallback(
    async (months: FinanceMonthYear[]) => {
      const now = new Date().toISOString();

      setState((prev) => {
        const existingKeys = new Set(prev.initiatedBatches.map((b) => monthKey({ month: b.month, year: b.year, label: '' } as FinanceMonthYear)));

        const next = [...prev.initiatedBatches];

        for (const m of months) {
          const key = monthKey(m);
          if (existingKeys.has(key)) continue;

          // Eligibility rule for accrual: apps submitted in that month and ready-to-be-paid.
          const eligible = dummyApplications.filter((a) => {
            const d = a.submittedAt ? new Date(a.submittedAt) : null;
            if (!d || Number.isNaN(d.getTime())) return false;
            const appMonth = d.getUTCMonth() + 1;
            const appYear = d.getUTCFullYear();
            return appMonth === m.month && appYear === m.year && a.status?.toUpperCase() === 'READY_TO_BE_PAID';
          });

          const applicationIds = eligible.map((e) => e._id);
          const snapshotsByApplicationId: Record<string, StoredSnapshot> = {};
          for (const app of eligible) {
            snapshotsByApplicationId[app._id] = {
              agentCommissionSnapshot: Number(app.agentCommission ?? 0),
              companyCommissionSnapshot: Number(app.companyCommission ?? 0),
              administrationFeesSnapshot: Number(app.administrationFees ?? 0),
            };
          }

          next.push({
            id: `batch-${m.year}-${String(m.month).padStart(2, '0')}`,
            month: m.month,
            year: m.year,
            createdAt: now,
            paid: false,
            applicationIds,
            snapshotsByApplicationId,
          });
        }

        return { initiatedBatches: next };
      });
    },
    [],
  );

  const markBatchAsPaid = useCallback(async (batchId: string) => {
    setState((prev) => {
      const next = prev.initiatedBatches.map((b) => {
        if (b.id !== batchId) return b;
        return { ...b, paid: true, createdAt: b.createdAt, id: b.id };
      });
      return { initiatedBatches: next };
    });
  }, []);

  const value = useMemo<FinanceMockContextValue>(
    () => ({
      agents: dummyAgents,
      applications: dummyApplications,
      state,
      actions: {
        initiatePaymentForMonths,
        markBatchAsPaid,
      },
    }),
    [initiatePaymentForMonths, markBatchAsPaid, state],
  );

  return <FinanceMockContext.Provider value={value}>{children}</FinanceMockContext.Provider>;
}

export function useFinanceMock() {
  const ctx = useContext(FinanceMockContext);
  if (!ctx) throw new Error('useFinanceMock must be used within FinanceMockProvider');
  return ctx;
}

