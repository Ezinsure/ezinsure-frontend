'use client';

import { useCallback } from 'react';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import type { PayoutStatus } from '../domain';
import { useAsyncResource } from '../hooks/use-async-resource';

interface PayoutsListQuery {
  from: string;
  to: string;
  search: string;
  status: string;
  page: number;
  pageSize: number;
  sort: string;
}

export function usePayoutsList(query: PayoutsListQuery) {
  const api = useFinanceLedgerApi();
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api.listPayouts(
        {
          module: 'livestock',
          page: query.page,
          pageSize: query.pageSize,
          sort: query.sort,
          search: query.search || undefined,
          status: (query.status || undefined) as PayoutStatus | undefined,
          period: { from: query.from, to: query.to, by: 'preparedAt' },
        },
        { signal },
      ),
    [api, query.page, query.pageSize, query.sort, query.search, query.status, query.from, query.to],
  );
  return useAsyncResource(fetcher);
}
