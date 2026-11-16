'use client';

import { useCallback } from 'react';
import { formatMoney } from '@/utils/money';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import { useAsyncResource } from '../hooks/use-async-resource';
import { Drawer } from '../ui/drawer';
import { ErrorState } from '../ui/state-panels';
import { formatLocalDate, formatLocalDateTime } from '../ui/format-local-date';
import { MoneyCell } from '../ui/money-cell';
import { Skeleton } from '../ui/skeleton';
import { PayoutStatusChip } from './payout-status-chip';

interface PayoutDetailDrawerProps {
  payoutId: string | undefined;
  onClose: () => void;
  onMarkPaid: () => void;
  onCancel: () => void;
}

function DetailBody({
  payoutId,
  onMarkPaid,
  onCancel,
}: {
  payoutId: string;
  onMarkPaid: () => void;
  onCancel: () => void;
}) {
  const api = useFinanceLedgerApi();
  const payoutFetcher = useCallback(
    (signal: AbortSignal) => api.getPayout(payoutId, { signal }),
    [api, payoutId],
  );
  const vetsFetcher = useCallback(
    (signal: AbortSignal) => api.listPayoutVets(payoutId, { pageSize: 100, sort: '-amount' }, { signal }),
    [api, payoutId],
  );
  const payout = useAsyncResource(payoutFetcher);
  const vets = useAsyncResource(vetsFetcher);

  if (payout.error) return <ErrorState message={payout.error} onRetry={payout.reload} />;
  if (payout.loading || !payout.data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const row = payout.data;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-base font-semibold text-slate-900">{row.payoutNumber}</span>
        <PayoutStatusChip status={row.status} />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Total</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
            {formatMoney(row.totalAmount)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Scope</dt>
          <dd className="mt-0.5 text-slate-800">
            {row.vetCount} vet{row.vetCount === 1 ? '' : 's'} · {row.lineCount} line
            {row.lineCount === 1 ? '' : 's'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Prepared</dt>
          <dd className="mt-0.5 text-slate-800">{formatLocalDateTime(row.preparedAt)}</dd>
          <dd className="text-xs text-slate-500">{row.preparedBy.name}</dd>
        </div>
        {row.paidAt ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Paid</dt>
            <dd className="mt-0.5 text-slate-800">{formatLocalDate(row.paidAt)}</dd>
            {row.paidBy ? <dd className="text-xs text-slate-500">{row.paidBy.name}</dd> : null}
          </div>
        ) : null}
        {row.cancelReason ? (
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Cancel reason</dt>
            <dd className="mt-0.5 text-slate-800">{row.cancelReason}</dd>
          </div>
        ) : null}
        {row.notes ? (
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Notes</dt>
            <dd className="mt-0.5 text-slate-800">{row.notes}</dd>
          </div>
        ) : null}
      </dl>

      {row.status === 'PREPARED' ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onMarkPaid}
            className="cursor-pointer rounded-lg bg-[var(--portal-primary)] px-3 py-2 text-sm font-medium text-white"
          >
            Mark paid
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700"
          >
            Cancel payout
          </button>
        </div>
      ) : null}

      <section aria-label="Vets in this payout">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Vets</h3>
        {vets.error ? (
          <ErrorState message={vets.error} onRetry={vets.reload} />
        ) : vets.loading || !vets.data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {vets.data.data.map((vet) => (
              <li key={vet.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{vet.name}</p>
                  <p className="text-xs text-slate-500">
                    {vet.lineCount} line{vet.lineCount === 1 ? '' : 's'}
                    {vet.paymentReference ? ` · ${vet.paymentReference}` : ''}
                  </p>
                </div>
                <MoneyCell value={vet.amount} className="shrink-0 font-medium" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export function PayoutDetailDrawer({ payoutId, onClose, onMarkPaid, onCancel }: PayoutDetailDrawerProps) {
  return (
    <Drawer open={Boolean(payoutId)} onClose={onClose} title="Payout details" eyebrow="Payout">
      {payoutId ? (
        <DetailBody payoutId={payoutId} onMarkPaid={onMarkPaid} onCancel={onCancel} />
      ) : null}
    </Drawer>
  );
}
