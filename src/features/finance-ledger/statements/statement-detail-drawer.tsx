'use client';

import { useCallback, useState } from 'react';
import { formatMoney } from '@/utils/money';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import { useAsyncResource } from '../hooks/use-async-resource';
import { Drawer } from '../ui/drawer';
import { ErrorState } from '../ui/state-panels';
import { formatLocalDate } from '../ui/format-local-date';
import { Pagination } from '../ui/pagination';
import { Skeleton } from '../ui/skeleton';
import { StatementLinesTable } from './statement-lines-table';
import { StatementStatusChip } from './statement-status-chip';

interface StatementDetailDrawerProps {
  statementId: string | undefined;
  onClose: () => void;
  onIssue: () => void;
  onWriteOff: () => void;
}

function DetailBody({
  statementId,
  onIssue,
  onWriteOff,
}: {
  statementId: string;
  onIssue: () => void;
  onWriteOff: () => void;
}) {
  const api = useFinanceLedgerApi();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState('paidAt');
  const [mismatchesOnly, setMismatchesOnly] = useState(false);

  const statementFetcher = useCallback(
    (signal: AbortSignal) => api.getStatement(statementId, { signal }),
    [api, statementId],
  );
  const linesFetcher = useCallback(
    (signal: AbortSignal) =>
      api.listStatementLines(
        statementId,
        { page, pageSize, sort, withMismatch: mismatchesOnly || undefined },
        { signal },
      ),
    [api, statementId, page, pageSize, sort, mismatchesOnly],
  );

  const statement = useAsyncResource(statementFetcher);
  const lines = useAsyncResource(linesFetcher);

  if (statement.error) return <ErrorState message={statement.error} onRetry={statement.reload} />;
  if (statement.loading || !statement.data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  const row = statement.data;
  const canIssue = row.status === 'OPEN' && row.lineCount > 0;
  const canWriteOff =
    (row.status === 'ISSUED' || row.status === 'PARTIALLY_RECONCILED') && row.outstandingAmount > 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-base font-semibold text-slate-900">{row.statementNumber}</span>
        <StatementStatusChip statement={row} />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Period</dt>
          <dd className="mt-0.5 text-slate-800">
            {formatLocalDate(row.periodFrom)} – {formatLocalDate(row.periodTo)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Scope</dt>
          <dd className="mt-0.5 text-slate-800">
            {row.lineCount} lines · {row.vetCount} vets
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Vet commission</dt>
          <dd className="mt-0.5 tabular-nums">{formatMoney(row.vetCommissionTotal)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Company commission</dt>
          <dd className="mt-0.5 tabular-nums">{formatMoney(row.companyCommissionTotal)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">VAT ({Math.round(row.vatRate * 100)}%)</dt>
          <dd className="mt-0.5 tabular-nums">{formatMoney(row.vatAmount)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Amount due</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums">{formatMoney(row.amountDue)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Received</dt>
          <dd className="mt-0.5 tabular-nums">{formatMoney(row.receivedAmount)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Still owed</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-amber-800">
            {formatMoney(row.outstandingAmount)}
          </dd>
        </div>
        {row.issuedAt ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Issued</dt>
            <dd className="mt-0.5">{formatLocalDate(row.issuedAt)}</dd>
          </div>
        ) : null}
        {row.dueAt ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Due</dt>
            <dd className="mt-0.5">{formatLocalDate(row.dueAt)}</dd>
          </div>
        ) : null}
        {row.openMismatchCount > 0 ? (
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Open differences</dt>
            <dd className="mt-0.5 text-amber-800">
              {row.openMismatchCount} · {formatMoney(row.openMismatchAmount)}
            </dd>
          </div>
        ) : null}
        {row.writeOffReason ? (
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Write-off reason</dt>
            <dd className="mt-0.5">{row.writeOffReason}</dd>
          </div>
        ) : null}
      </dl>

      {(canIssue || canWriteOff) && (
        <div className="flex flex-wrap gap-2">
          {canIssue ? (
            <button
              type="button"
              onClick={onIssue}
              className="cursor-pointer rounded-lg bg-[var(--portal-primary)] px-3 py-2 text-sm font-medium text-white"
            >
              Issue to SONARWA
            </button>
          ) : null}
          {canWriteOff ? (
            <button
              type="button"
              onClick={onWriteOff}
              className="cursor-pointer rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700"
            >
              Write off remainder
            </button>
          ) : null}
        </div>
      )}

      <section aria-label="Statement lines" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lines</h3>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={mismatchesOnly}
              onChange={(e) => {
                setMismatchesOnly(e.target.checked);
                setPage(1);
              }}
            />
            Open differences only
          </label>
        </div>
        <StatementLinesTable
          rows={lines.data?.data}
          loading={lines.loading}
          fetching={lines.fetching}
          error={lines.error}
          sort={sort}
          onRetry={lines.reload}
          onSortChange={(next) => {
            setSort(next);
            setPage(1);
          }}
        />
        <Pagination
          meta={lines.data?.meta}
          disabled={lines.fetching}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>
    </>
  );
}

export function StatementDetailDrawer({
  statementId,
  onClose,
  onIssue,
  onWriteOff,
}: StatementDetailDrawerProps) {
  return (
    <Drawer
      open={Boolean(statementId)}
      onClose={onClose}
      title="Statement details"
      eyebrow="SONARWA statement"
      className="max-w-xl"
    >
      {statementId ? (
        <DetailBody statementId={statementId} onIssue={onIssue} onWriteOff={onWriteOff} />
      ) : null}
    </Drawer>
  );
}
