'use client';

import { useCallback } from 'react';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import type { LedgerSource, LedgerStage } from '../domain';
import { useAsyncResource } from '../hooks/use-async-resource';
import type { LedgerFilterValues } from './ledger-filters';

interface LedgerListQuery extends LedgerFilterValues {
  page: number;
  pageSize: number;
  sort: string;
}

/** Server-paged ledger lines for the current URL filters. */
export function useLedgerLines(query: LedgerListQuery) {
  const api = useFinanceLedgerApi();

  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api.listLines(
        {
          module: 'livestock',
          page: query.page,
          pageSize: query.pageSize,
          sort: query.sort,
          search: query.search || undefined,
          stage: query.stage.length ? (query.stage as LedgerStage[]) : undefined,
          source: (query.source || undefined) as LedgerSource | undefined,
          hasOpenMismatch: query.mismatch === 'open' ? true : undefined,
          period: { from: query.from, to: query.to, by: 'submittedAt' },
        },
        { signal },
      ),
    [
      api,
      query.page,
      query.pageSize,
      query.sort,
      query.search,
      query.stage,
      query.source,
      query.mismatch,
      query.from,
      query.to,
    ],
  );

  return useAsyncResource(fetcher);
}
