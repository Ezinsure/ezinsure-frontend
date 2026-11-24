'use client';

import type { Receipt } from '../domain';
import { DataTable } from '../ui/data-table';
import type { Column } from '../ui/data-table-types';
import { EmptyState } from '../ui/state-panels';
import { formatLocalDate } from '../ui/format-local-date';
import { MoneyCell } from '../ui/money-cell';

const COLUMNS: Column<Receipt>[] = [
  {
    id: 'number',
    header: 'Receipt',
    sortKey: 'receiptNumber',
    cell: (row) => <span className="font-mono font-medium text-slate-900">{row.receiptNumber}</span>,
  },
  {
    id: 'received',
    header: 'Received',
    sortKey: 'receivedAt',
    firstSort: 'desc',
    cell: (row) => formatLocalDate(row.receivedAt),
  },
  {
    id: 'reference',
    header: 'SONARWA reference',
    sortKey: 'reference',
    cell: (row) => <span className="font-mono text-sm">{row.reference}</span>,
  },
  {
    id: 'statements',
    header: 'Allocated to',
    hideBelow: 'md',
    cell: (row) =>
      row.allocations.map((a) => a.statementNumber ?? a.statementId).join(', ') || '—',
  },
  {
    id: 'amount',
    header: 'Amount',
    sortKey: 'amount',
    firstSort: 'desc',
    align: 'right',
    cell: (row) => <MoneyCell value={row.amount} />,
  },
  {
    id: 'mismatches',
    header: 'Differences',
    align: 'right',
    hideBelow: 'lg',
    cell: (row) =>
      row.mismatchCount > 0 ? (
        <span className="font-medium text-amber-700">{row.mismatchCount}</span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
];

interface ReceiptsTableProps {
  rows: Receipt[] | undefined;
  loading: boolean;
  fetching: boolean;
  error: string | undefined;
  sort: string;
  activeId?: string;
  onRetry: () => void;
  onSortChange: (sort: string) => void;
  onOpen: (receipt: Receipt) => void;
}

export function ReceiptsTable(props: ReceiptsTableProps) {
  return (
    <DataTable
      caption="Payments received from SONARWA"
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
          title="No receipts in this period"
          description="Record a SONARWA bank payment to allocate it to issued statements."
        />
      }
    />
  );
}
