'use client';

import type { LedgerLine } from '../domain';
import type { Column } from '../ui/data-table-types';
import { DataTable } from '../ui/data-table';
import { EmptyState } from '../ui/state-panels';
import { formatLocalDate } from '../ui/format-local-date';
import { MoneyCell } from '../ui/money-cell';
import { StageChip } from '../ui/stage-chip';
import { StatusChip } from '../ui/status-chip';

const COLUMNS: Column<LedgerLine>[] = [
  {
    id: 'contract',
    header: 'Contract',
    sortKey: 'contractNumber',
    cell: (line) => (
      <div>
        <p className="font-medium text-slate-900">{line.contractNumber}</p>
        {line.microchipNumber ? (
          <p className="font-mono text-xs text-slate-500">{line.microchipNumber}</p>
        ) : null}
      </div>
    ),
  },
  {
    id: 'client',
    header: 'Client',
    sortKey: 'clientName',
    hideBelow: 'md',
    cell: (line) => (
      <div>
        <p>{line.clientName}</p>
        {line.clientDistrict ? <p className="text-xs text-slate-500">{line.clientDistrict}</p> : null}
      </div>
    ),
  },
  {
    id: 'vet',
    header: 'Vet',
    cell: (line) => (
      <div>
        <p>{line.vet.name}</p>
        <p className="text-xs text-slate-500">
          {line.source === 'EXTERNAL_VET' ? 'External' : 'Platform'}
        </p>
      </div>
    ),
  },
  {
    id: 'stage',
    header: 'Stage',
    sortKey: 'stage',
    cell: (line) => (
      <div className="flex flex-col items-start gap-1">
        <StageChip stage={line.stage} />
        {line.hasOpenMismatch ? (
          <StatusChip
            label="Difference"
            tone="amber"
            description="SONARWA paid a different amount for this line."
          />
        ) : null}
      </div>
    ),
  },
  {
    id: 'submitted',
    header: 'Submitted',
    sortKey: 'submittedAt',
    firstSort: 'desc',
    hideBelow: 'lg',
    cell: (line) => formatLocalDate(line.submittedAt),
  },
  {
    id: 'paid',
    header: 'Paid',
    sortKey: 'paidAt',
    firstSort: 'desc',
    cell: (line) => formatLocalDate(line.paidAt),
  },
  {
    id: 'vetc',
    header: 'Vet commission',
    sortKey: 'vetCommission',
    firstSort: 'desc',
    align: 'right',
    cell: (line) => <MoneyCell value={line.vetCommission} />,
  },
  {
    id: 'expected',
    header: 'Expected from SONARWA',
    sortKey: 'expectedAmount',
    firstSort: 'desc',
    align: 'right',
    hideBelow: 'md',
    cell: (line) => <MoneyCell value={line.expectedAmount} />,
  },
];

interface LedgerTableProps {
  rows: LedgerLine[] | undefined;
  loading: boolean;
  fetching: boolean;
  error: string | undefined;
  onRetry: () => void;
  sort: string;
  onSortChange: (sort: string) => void;
  activeLineId?: string;
  onRowClick: (line: LedgerLine) => void;
}

export function LedgerTable({
  rows,
  loading,
  fetching,
  error,
  onRetry,
  sort,
  onSortChange,
  activeLineId,
  onRowClick,
}: LedgerTableProps) {
  return (
    <DataTable
      caption="Commission lines across the full lifecycle"
      columns={COLUMNS}
      rows={rows}
      rowKey={(line) => line.id}
      loading={loading}
      fetching={fetching}
      error={error}
      onRetry={onRetry}
      sort={sort}
      onSortChange={onSortChange}
      onRowClick={onRowClick}
      activeRowKey={activeLineId}
      emptyState={
        <EmptyState
          title="No lines match these filters"
          description="Try a wider period, or clear the stage and search filters."
        />
      }
    />
  );
}
