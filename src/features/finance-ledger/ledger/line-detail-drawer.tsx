'use client';

import { useCallback } from 'react';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import { useAsyncResource } from '../hooks/use-async-resource';
import { Drawer } from '../ui/drawer';
import { ErrorState } from '../ui/state-panels';
import { Skeleton } from '../ui/skeleton';
import { StageChip } from '../ui/stage-chip';
import { formatLocalDate } from '../ui/format-local-date';
import { LineMoneySummary } from './line-money-summary';
import { LineTimeline } from './line-timeline';

interface LineDetailDrawerProps {
  lineId: string | undefined;
  onClose: () => void;
}

function DetailBody({ lineId }: { lineId: string }) {
  const api = useFinanceLedgerApi();
  const fetcher = useCallback(
    (signal: AbortSignal) => api.getLineDetail(lineId, { signal }),
    [api, lineId],
  );
  const { data, loading, error, reload } = useAsyncResource(fetcher);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const { line, timeline } = data;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-base font-semibold text-slate-900">{line.contractNumber}</span>
        <StageChip stage={line.stage} />
      </div>

      <section aria-label="Line summary" className="space-y-2 text-sm">
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Client</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{line.clientName}</dd>
            {line.clientDistrict ? <dd className="text-xs text-slate-500">{line.clientDistrict}</dd> : null}
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Vet</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{line.vet.name}</dd>
            <dd className="text-xs text-slate-500">
              {line.source === 'EXTERNAL_VET' ? 'External request' : 'Platform application'}
            </dd>
          </div>
          {line.microchipNumber ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Microchip</dt>
              <dd className="mt-0.5 font-mono text-slate-800">{line.microchipNumber}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Submitted</dt>
            <dd className="mt-0.5 text-slate-800">{formatLocalDate(line.submittedAt)}</dd>
          </div>
          {line.payoutNumber ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Payout</dt>
              <dd className="mt-0.5 font-mono text-slate-800">{line.payoutNumber}</dd>
            </div>
          ) : null}
          {line.statementNumber ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Statement</dt>
              <dd className="mt-0.5 font-mono text-slate-800">{line.statementNumber}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section aria-label="Money">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Money</h3>
        <LineMoneySummary line={line} />
      </section>

      <section aria-label="Timeline">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</h3>
        <LineTimeline events={timeline} />
      </section>
    </>
  );
}

/** Side panel: one line's money breakdown and full lifecycle timeline. */
export function LineDetailDrawer({ lineId, onClose }: LineDetailDrawerProps) {
  return (
    <Drawer open={Boolean(lineId)} onClose={onClose} title="Line details" eyebrow="Commission line">
      {lineId ? <DetailBody lineId={lineId} /> : null}
    </Drawer>
  );
}
