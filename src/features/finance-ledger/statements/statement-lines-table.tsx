'use client';

import type { StatementLine } from '../domain';
import { DataTable } from '../ui/data-table';
import type { Column } from '../ui/data-table-types';
import { EmptyState } from '../ui/state-panels';
import { formatLocalDate } from '../ui/format-local-date';
import { MoneyCell } from '../ui/money-cell';
import { StatusChip } from '../ui/status-chip';

const COLUMNS: Column<StatementLine>[] = [
  {
    id: 'contract',
    header: 'Contract',
    sortKey: 'contractNumber',
    cell: (row) => <span className="font-mono text-sm font-medium">{row.contractNumber}</span>,
  },
  {
    id: 'client',
    header: 'Client',
    hideBelow: 'md',
    cell: (row) => row.clientName,
  },
  {
    id: 'vet',
    header: 'Vet',
    cell: (row) => row.vetName,
  },
  {
    id: 'paid',
    header: 'Paid',
    sortKey: 'paidAt',
    firstSort: 'desc',
    cell: (row) => formatLocalDate(row.paidAt),
  },
  {
    id: 'expected',
    header: 'Expected',
    sortKey: 'expectedAmount',
    firstSort: 'desc',
    align: 'right',
    cell: (row) => <MoneyCell value={row.expectedAmount} />,
  },
  {
    id: 'received',
    header: 'Received',
    align: 'right',
    cell: (row) => <MoneyCell value={row.receivedAmount} dashForZero />,
  },
  {
    id: 'diff',
    header: 'Difference',
    align: 'right',
    cell: (row) =>
      row.differenceAmount !== undefined ? (
        <div className="flex flex-col items-end gap-1">
          <MoneyCell value={row.differenceAmount} signed tinted dashForZero />
          {row.mismatchStatus === 'OPEN' ? (
            <StatusChip label="Open" tone="amber" />
          ) : row.mismatchStatus ? (
            <StatusChip label={row.mismatchStatus.replace('_', ' ').toLowerCase()} tone="slate" />
          ) : null}
        </div>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
];

interface StatementLinesTableProps {
  rows: StatementLine[] | undefined;
  loading: boolean;
  fetching: boolean;
  error: string | undefined;
  sort: string;
  onRetry: () => void;
  onSortChange: (sort: string) => void;
}

export function StatementLinesTable(props: StatementLinesTableProps) {
  return (
    <DataTable
      caption="Lines on this statement"
      columns={COLUMNS}
      rows={props.rows}
      rowKey={(row) => row.lineId}
      loading={props.loading}
      fetching={props.fetching}
      error={props.error}
      onRetry={props.onRetry}
      sort={props.sort}
      onSortChange={props.onSortChange}
      skeletonRows={5}
      emptyState={
        <EmptyState title="No lines on this statement" description="Pay vets in this period first." />
      }
    />
  );
}
