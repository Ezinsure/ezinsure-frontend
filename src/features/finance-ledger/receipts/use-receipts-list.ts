'use client';

import { useCallback } from 'react';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import { useAsyncResource } from '../hooks/use-async-resource';

interface ReceiptsListQuery {
  from: string;
  to: string;
  search: string;
  statementId: string;
  page: number;
  pageSize: number;
  sort: string;
}

export function useReceiptsList(query: ReceiptsListQuery) {
  const api = useFinanceLedgerApi();
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api.listReceipts(
        {
          module: 'livestock',
          page: query.page,
          pageSize: query.pageSize,
          sort: query.sort,
          search: query.search || undefined,
          statementId: query.statementId || undefined,
          period: { from: query.from, to: query.to },
        },
        { signal },
      ),
    [
      api,
      query.page,
      query.pageSize,
      query.sort,
      query.search,
      query.statementId,
      query.from,
      query.to,
    ],
  );
  return useAsyncResource(fetcher);
}
