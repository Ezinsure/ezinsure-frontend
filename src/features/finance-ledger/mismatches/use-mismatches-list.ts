'use client';

import { useCallback } from 'react';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import type { MismatchKind, MismatchStatus } from '../domain';
import { useAsyncResource } from '../hooks/use-async-resource';

interface MismatchesListQuery {
  from: string;
  to: string;
  search: string;
  status: string;
  kind: string;
  statementId: string;
  page: number;
  pageSize: number;
  sort: string;
}

export function useMismatchesList(query: MismatchesListQuery) {
  const api = useFinanceLedgerApi();
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api.listMismatches(
        {
          module: 'livestock',
          page: query.page,
          pageSize: query.pageSize,
          sort: query.sort,
          search: query.search || undefined,
          status: (query.status || undefined) as MismatchStatus | undefined,
          kind: (query.kind || undefined) as MismatchKind | undefined,
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
      query.status,
      query.kind,
      query.statementId,
      query.from,
      query.to,
    ],
  );
  return useAsyncResource(fetcher);
}
