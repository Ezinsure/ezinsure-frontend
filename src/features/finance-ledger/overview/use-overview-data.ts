'use client';

import { useCallback } from 'react';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import type { FinanceModule } from '../domain';
import { useAsyncResource } from '../hooks/use-async-resource';
import type { DateSpan } from '../period/presets';

export interface PendingCounts {
  readyLineCount: number;
  preparedPayoutCount: number;
}

/**
 * Everything Finance Home needs: the month-by-month summary for the chosen
 * period, plus two cheap "right now" counts (page size 1, we only read `total`).
 */
export function useOverviewData(module: FinanceModule, span: DateSpan) {
  const api = useFinanceLedgerApi();

  const summaryFetcher = useCallback(
    (signal: AbortSignal) => api.getSummary({ module, from: span.from, to: span.to }, { signal }),
    [api, module, span.from, span.to],
  );
  const countsFetcher = useCallback(
    async (signal: AbortSignal): Promise<PendingCounts> => {
      const [lines, payouts] = await Promise.all([
        api.listLines({ module, stage: 'READY_TO_BE_PAID', pageSize: 1 }, { signal }),
        api.listPayouts({ module, status: 'PREPARED', pageSize: 1 }, { signal }),
      ]);
      return { readyLineCount: lines.meta.total, preparedPayoutCount: payouts.meta.total };
    },
    [api, module],
  );

  const summary = useAsyncResource(summaryFetcher);
  const counts = useAsyncResource(countsFetcher);

  const { reload: reloadSummary } = summary;
  const { reload: reloadCounts } = counts;
  const reload = useCallback(() => {
    reloadSummary();
    reloadCounts();
  }, [reloadSummary, reloadCounts]);

  return { summary, counts, reload };
}
