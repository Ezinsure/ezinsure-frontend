'use client';

import { useMemo } from 'react';
import { FINANCE_MOCK_ENABLED } from '@/config/finance';
import { useApiClient } from '@/utils/apiClient';
import { createFinanceLedgerApi } from './create-api';
import type { FinanceLedgerApi } from './types';

/**
 * Demo implementation, loaded on first call only so it never ships in the
 * normal bundle path. Used when NEXT_PUBLIC_FINANCE_MOCK=true.
 */
function createLazyMockApi(): FinanceLedgerApi {
  return new Proxy({} as FinanceLedgerApi, {
    get: (_target, method: string) => async (...args: unknown[]) => {
      const { getMockFinanceLedgerApi } = await import('../mock');
      const api = getMockFinanceLedgerApi() as unknown as Record<
        string,
        (...a: unknown[]) => Promise<unknown>
      >;
      return api[method](...args);
    },
  });
}

/**
 * The finance ledger API. The returned object is stable for the lifetime of the
 * session token, so it is safe to use in effect dependency lists.
 */
export function useFinanceLedgerApi(): FinanceLedgerApi {
  const { apiFetch } = useApiClient();
  return useMemo(
    () => (FINANCE_MOCK_ENABLED ? createLazyMockApi() : createFinanceLedgerApi(apiFetch)),
    [apiFetch],
  );
}
