'use client';

import { overdueLevel, parseDateOnly, type Statement } from '../domain';
import { cx } from '../ui/cx';
import { DataTable } from '../ui/data-table';
import type { Column } from '../ui/data-table-types';
import { EmptyState } from '../ui/state-panels';
import { formatLocalDate } from '../ui/format-local-date';
import { MoneyCell } from '../ui/money-cell';
import { StatementStatusChip } from './statement-status-chip';

const monthLabel = (statement: Statement): string =>
  parseDateOnly(statement.periodFrom).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

const AGE = {
  ok: 'text-slate-600',
  warning: 'text-amber-700',
  critical: 'font-medium text-rose-700',
} as const;

const COLUMNS: Column<Statement>[] = [
  {
    id: 'period',
    header: 'Period',
    sortKey: 'periodFrom',
    firstSort: 'desc',
    cell: (row) => (
      <div>
        <p className="font-medium text-slate-900">{monthLabel(row)}</p>
        <p className="font-mono text-xs text-slate-500">{row.statementNumber}</p>
      </div>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    sortKey: 'status',
    cell: (row) => <StatementStatusChip statement={row} />,
  },
  {
    id: 'lines',
    header: 'Lines',
    sortKey: 'lineCount',
    firstSort: 'desc',
    align: 'right',
    hideBelow: 'md',
    cell: (row) => row.lineCount.toLocaleString(),
  },
  {
    id: 'due',
    header: 'Amount due',
    sortKey: 'amountDue',
    firstSort: 'desc',
    align: 'right',
    cell: (row) => <MoneyCell value={row.amountDue} dashForZero />,
  },
  {
    id: 'received',
    header: 'Received',
    sortKey: 'receivedAmount',
    firstSort: 'desc',
    align: 'right',
    cell: (row) => <MoneyCell value={row.receivedAmount} dashForZero />,
  },
  {
    id: 'owed',
    header: 'Still owed',
    sortKey: 'outstandingAmount',
    firstSort: 'desc',
    align: 'right',
    cell: (row) => (
      <MoneyCell
        value={row.outstandingAmount}
        dashForZero
        className={cx(row.outstandingAmount > 0 && 'font-medium text-amber-700')}
      />
    ),
  },
  {
    id: 'issued',
    header: 'Issued',
    sortKey: 'issuedAt',
    firstSort: 'desc',
    hideBelow: 'lg',
    cell: (row) => formatLocalDate(row.issuedAt),
  },
  {
    id: 'waiting',
    header: 'Waiting',
    align: 'right',
    hideBelow: 'md',
    cell: (row) =>
      row.ageDays !== undefined && row.outstandingAmount > 0 ? (
        <span className={cx('tabular-nums', AGE[overdueLevel(row.ageDays)])}>{row.ageDays} days</span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
  {
    id: 'actions',
    header: 'Actions',
    align: 'right',
    cell: (row) => {
      if (row.status === 'OPEN' && row.lineCount > 0) {
        return <span className="text-sm font-medium text-[var(--portal-primary)]">Issue</span>;
      }
      if (row.status === 'ISSUED' || row.status === 'PARTIALLY_RECONCILED') {
        return <span className="text-sm text-slate-500">Open</span>;
      }
      return <span className="text-xs text-slate-400">—</span>;
    },
  },
];

interface StatementsTableProps {
  rows: Statement[] | undefined;
  loading: boolean;
  fetching: boolean;
  error: string | undefined;
  sort: string;
  activeId?: string;
  onRetry: () => void;
  onSortChange: (sort: string) => void;
  onOpen: (statement: Statement) => void;
}

export function StatementsTable(props: StatementsTableProps) {
  return (
    <DataTable
      caption="Statements billed to SONARWA by month"
      columns={COLUMNS}
      rows={props.rows}
      rowKey={(row) => row.id}
      loading={props.loading}
      fetching={props.fetching}
      error={props.error}
      onRetry={props.onRetry}
      sort={props.sort}
      onSortChange={props.onSortChange}
      onRowClick={props.onOpen}
      activeRowKey={props.activeId}
      emptyState={
        <EmptyState
          title="No statements in this period"
          description="Widen the period, or pay vets so an open statement appears for the month."
        />
      }
    />
  );
}
