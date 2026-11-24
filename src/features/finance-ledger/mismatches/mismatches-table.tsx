'use client';

import {
  MISMATCH_KIND_LABELS,
  type Mismatch,
  type MismatchKind,
} from '../domain';
import { DataTable } from '../ui/data-table';
import type { Column } from '../ui/data-table-types';
import { EmptyState } from '../ui/state-panels';
import { formatLocalDate } from '../ui/format-local-date';
import { MoneyCell } from '../ui/money-cell';
import { MismatchStatusChip } from './mismatch-status-chip';

const COLUMNS: Column<Mismatch>[] = [
  {
    id: 'contract',
    header: 'Contract',
    sortKey: 'contractNumber',
    cell: (row) => (
      <div>
        <p className="font-mono font-medium text-slate-900">{row.contractNumber}</p>
        {row.vetName ? <p className="text-xs text-slate-500">{row.vetName}</p> : null}
      </div>
    ),
  },
  {
    id: 'kind',
    header: 'Kind',
    sortKey: 'kind',
    cell: (row) => MISMATCH_KIND_LABELS[row.kind as MismatchKind],
  },
  {
    id: 'status',
    header: 'Status',
    sortKey: 'status',
    cell: (row) => <MismatchStatusChip status={row.status} />,
  },
  {
    id: 'statement',
    header: 'Statement',
    sortKey: 'statementNumber',
    hideBelow: 'md',
    cell: (row) => <span className="font-mono text-sm">{row.statementNumber}</span>,
  },
  {
    id: 'expected',
    header: 'Expected',
    sortKey: 'expectedAmount',
    firstSort: 'desc',
    align: 'right',
    hideBelow: 'lg',
    cell: (row) => <MoneyCell value={row.expectedAmount} dashForZero />,
  },
  {
    id: 'sonarwa',
    header: 'SONARWA',
    sortKey: 'sonarwaAmount',
    firstSort: 'desc',
    align: 'right',
    hideBelow: 'lg',
    cell: (row) => <MoneyCell value={row.sonarwaAmount} dashForZero />,
  },
  {
    id: 'diff',
    header: 'Difference',
    sortKey: 'differenceAmount',
    firstSort: 'desc',
    align: 'right',
    cell: (row) => <MoneyCell value={row.differenceAmount} signed tinted />,
  },
  {
    id: 'created',
    header: 'Opened',
    sortKey: 'createdAt',
    firstSort: 'desc',
    hideBelow: 'md',
    cell: (row) => formatLocalDate(row.createdAt),
  },
];

interface MismatchesTableProps {
  rows: Mismatch[] | undefined;
  loading: boolean;
  fetching: boolean;
  error: string | undefined;
  sort: string;
  activeId?: string;
  onRetry: () => void;
  onSortChange: (sort: string) => void;
  onOpen: (mismatch: Mismatch) => void;
}

export function MismatchesTable(props: MismatchesTableProps) {
  return (
    <DataTable
      caption="Differences between our records and what SONARWA paid"
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
          title="No differences match these filters"
          description="Open differences appear when a receipt underpays a line, or a billed line was never covered."
        />
      }
    />
  );
}
