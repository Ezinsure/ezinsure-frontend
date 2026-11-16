'use client';

import { useCallback } from 'react';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import type { StatementStatus } from '../domain';
import { useAsyncResource } from '../hooks/use-async-resource';

interface StatementsListQuery {
  from: string;
  to: string;
  status: string;
  overdueOnly: boolean;
  page: number;
  pageSize: number;
  sort: string;
}

export function useStatementsList(query: StatementsListQuery) {
  const api = useFinanceLedgerApi();
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api.listStatements(
        {
          module: 'livestock',
          page: query.page,
          pageSize: query.pageSize,
          sort: query.sort,
          status: (query.status || undefined) as StatementStatus | undefined,
          overdueOnly: query.overdueOnly || undefined,
          period: { from: query.from, to: query.to },
        },
        { signal },
      ),
    [
      api,
      query.page,
      query.pageSize,
      query.sort,
      query.status,
      query.overdueOnly,
      query.from,
      query.to,
    ],
  );
  return useAsyncResource(fetcher);
}
