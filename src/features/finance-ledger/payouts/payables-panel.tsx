'use client';

import { formatMoney } from '@/utils/money';
import type { PayableVetRow } from '../domain';
import type { TableSelection } from '../hooks/use-table-selection';
import { DataTable } from '../ui/data-table';
import type { Column } from '../ui/data-table-types';
import { EmptyState } from '../ui/state-panels';
import { MoneyCell } from '../ui/money-cell';
import { Pagination } from '../ui/pagination';
import { PeriodPicker } from '../ui/period-picker';
import { SearchBox } from '../ui/search-box';
import type { DateSpan } from '../period/presets';
import type { PageMeta } from '../domain';

const COLUMNS: Column<PayableVetRow>[] = [
  {
    id: 'vet',
    header: 'Vet',
    sortKey: 'name',
    cell: (row) => (
      <div>
        <p className="font-medium text-slate-900">{row.name}</p>
        {row.district ? <p className="text-xs text-slate-500">{row.district}</p> : null}
      </div>
    ),
  },
  {
    id: 'bank',
    header: 'Bank details',
    hideBelow: 'md',
    cell: (row) =>
      row.bankName || row.bankAccountNumber ? (
        <div>
          <p>{row.bankName ?? '—'}</p>
          {row.bankAccountNumber ? (
            <p className="font-mono text-xs text-slate-500">{row.bankAccountNumber}</p>
          ) : null}
        </div>
      ) : (
        <span className="text-amber-700">Missing bank details</span>
      ),
  },
  {
    id: 'phone',
    header: 'Phone',
    hideBelow: 'lg',
    cell: (row) => row.phoneNumber ?? '—',
  },
  {
    id: 'lines',
    header: 'Lines',
    sortKey: 'lineCount',
    firstSort: 'desc',
    align: 'right',
    cell: (row) => row.lineCount.toLocaleString(),
  },
  {
    id: 'amount',
    header: 'Vet commission',
    sortKey: 'amount',
    firstSort: 'desc',
    align: 'right',
    cell: (row) => <MoneyCell value={row.amount} />,
  },
];

const PRESETS = ['thisMonth', 'lastMonth', 'quarter', 'sixMonths'] as const;

interface PayablesPanelProps {
  span: DateSpan;
  search: string;
  sort: string;
  rows: PayableVetRow[] | undefined;
  meta: PageMeta | undefined;
  loading: boolean;
  fetching: boolean;
  error: string | undefined;
  selection: TableSelection;
  onRetry: () => void;
  onSpanChange: (span: DateSpan) => void;
  onSearch: (search: string) => void;
  onSortChange: (sort: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onPrepare: () => void;
}

export function PayablesPanel({
  span,
  search,
  sort,
  rows,
  meta,
  loading,
  fetching,
  error,
  selection,
  onRetry,
  onSpanChange,
  onSearch,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onPrepare,
}: PayablesPanelProps) {
  const selectedAmount =
    rows
      ?.filter((r) => selection.isSelected(r.id))
      .reduce((sum, r) => sum + r.amount, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <PeriodPicker
          value={span}
          onChange={onSpanChange}
          presets={PRESETS}
          label="Approved in"
        />
        <SearchBox
          value={search}
          onSearch={onSearch}
          placeholder="Search vet name or district"
          className="min-w-[14rem] flex-1"
        />
        <button
          type="button"
          disabled={selection.count === 0}
          onClick={onPrepare}
          className="cursor-pointer rounded-lg bg-[var(--portal-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm enabled:hover:bg-[var(--portal-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prepare payout
          {selection.count > 0 ? ` (${selection.count})` : ''}
        </button>
      </div>

      {selection.count > 0 ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {selection.count} vet{selection.count === 1 ? '' : 's'} selected
          {selectedAmount > 0 ? ` · ${formatMoney(selectedAmount)} on this page` : ''}. Selection
          is kept when you change pages.
        </p>
      ) : (
        <p className="text-sm text-slate-500">
          Select the vets to pay. Their approved lines will be grouped into one payout.
        </p>
      )}

      <DataTable
        caption="Vets with lines ready to be paid"
        columns={COLUMNS}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        fetching={fetching}
        error={error}
        onRetry={onRetry}
        sort={sort}
        onSortChange={onSortChange}
        selection={selection}
        emptyState={
          <EmptyState
            title="No vets are ready to pay"
            description="Approved lines will show up here once they are ready for payout."
          />
        }
      />

      <Pagination
        meta={meta}
        disabled={fetching}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
