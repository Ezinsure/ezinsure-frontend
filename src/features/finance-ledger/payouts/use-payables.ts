'use client';

import { useCallback } from 'react';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import { useAsyncResource } from '../hooks/use-async-resource';

interface PayablesQuery {
  from: string;
  to: string;
  search: string;
  page: number;
  pageSize: number;
  sort: string;
}

export function usePayables(query: PayablesQuery) {
  const api = useFinanceLedgerApi();
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api.listPayableVets(
        {
          module: 'livestock',
          page: query.page,
          pageSize: query.pageSize,
          sort: query.sort,
          search: query.search || undefined,
          period: { from: query.from, to: query.to, by: 'approvedAt' },
        },
        { signal },
      ),
    [api, query.page, query.pageSize, query.sort, query.search, query.from, query.to],
  );
  return useAsyncResource(fetcher);
}
