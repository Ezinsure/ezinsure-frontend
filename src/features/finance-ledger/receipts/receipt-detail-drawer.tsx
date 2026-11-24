'use client';

import { useCallback } from 'react';
import { formatMoney } from '@/utils/money';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import { useAsyncResource } from '../hooks/use-async-resource';
import { Drawer } from '../ui/drawer';
import { ErrorState } from '../ui/state-panels';
import { formatLocalDate } from '../ui/format-local-date';
import { MoneyCell } from '../ui/money-cell';
import { Skeleton } from '../ui/skeleton';

interface ReceiptDetailDrawerProps {
  receiptId: string | undefined;
  onClose: () => void;
}

function DetailBody({ receiptId }: { receiptId: string }) {
  const api = useFinanceLedgerApi();
  const fetcher = useCallback(
    (signal: AbortSignal) => api.getReceipt(receiptId, { signal }),
    [api, receiptId],
  );
  const { data, loading, error, reload } = useAsyncResource(fetcher);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-base font-semibold text-slate-900">{data.receiptNumber}</span>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Amount</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums">{formatMoney(data.amount)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Received</dt>
          <dd className="mt-0.5">{formatLocalDate(data.receivedAt)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs uppercase tracking-wide text-slate-500">SONARWA reference</dt>
          <dd className="mt-0.5 font-mono text-slate-800">{data.reference}</dd>
        </div>
        {data.note ? (
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Note</dt>
            <dd className="mt-0.5 text-slate-800">{data.note}</dd>
          </div>
        ) : null}
        {data.mismatchCount > 0 ? (
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Differences created</dt>
            <dd className="mt-0.5 text-amber-800">
              {data.mismatchCount} line{data.mismatchCount === 1 ? '' : 's'} paid less than expected
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Recorded by</dt>
          <dd className="mt-0.5">{data.createdBy.name}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Recorded at</dt>
          <dd className="mt-0.5">{formatLocalDate(data.createdAt)}</dd>
        </div>
      </dl>

      <section aria-label="Allocations">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Allocated to statements
        </h3>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {data.allocations.map((a) => (
            <li key={a.statementId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span className="font-mono text-slate-800">{a.statementNumber ?? a.statementId}</span>
              <MoneyCell value={a.amount} className="font-medium" />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function ReceiptDetailDrawer({ receiptId, onClose }: ReceiptDetailDrawerProps) {
  return (
    <Drawer open={Boolean(receiptId)} onClose={onClose} title="Receipt details" eyebrow="SONARWA payment">
      {receiptId ? <DetailBody receiptId={receiptId} /> : null}
    </Drawer>
  );
}
