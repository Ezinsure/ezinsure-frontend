'use client';

import type { Payout, PayoutStatus, PageMeta } from '../domain';
import { PAYOUT_STATUSES, PAYOUT_STATUS_LABELS } from '../domain';
import { DataTable } from '../ui/data-table';
import type { Column } from '../ui/data-table-types';
import { EmptyState } from '../ui/state-panels';
import { FilterChip } from '../ui/filter-chip';
import { formatLocalDate } from '../ui/format-local-date';
import { MoneyCell } from '../ui/money-cell';
import { Pagination } from '../ui/pagination';
import { PeriodPicker } from '../ui/period-picker';
import { SearchBox } from '../ui/search-box';
import type { DateSpan } from '../period/presets';
import { PayoutStatusChip } from './payout-status-chip';

const PRESETS = ['thisMonth', 'lastMonth', 'quarter', 'sixMonths', 'thisYear'] as const;

interface PayoutsPanelProps {
  span: DateSpan;
  search: string;
  status: string;
  sort: string;
  rows: Payout[] | undefined;
  meta: PageMeta | undefined;
  loading: boolean;
  fetching: boolean;
  error: string | undefined;
  activePayoutId?: string;
  onRetry: () => void;
  onSpanChange: (span: DateSpan) => void;
  onSearch: (search: string) => void;
  onStatusChange: (status: string) => void;
  onSortChange: (sort: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onOpen: (payout: Payout) => void;
  onMarkPaid: (payout: Payout) => void;
  onCancel: (payout: Payout) => void;
}

export function PayoutsPanel({
  span,
  search,
  status,
  sort,
  rows,
  meta,
  loading,
  fetching,
  error,
  activePayoutId,
  onRetry,
  onSpanChange,
  onSearch,
  onStatusChange,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onOpen,
  onMarkPaid,
  onCancel,
}: PayoutsPanelProps) {
  const columns: Column<Payout>[] = [
    {
      id: 'number',
      header: 'Payout',
      sortKey: 'payoutNumber',
      cell: (row) => <span className="font-mono font-medium text-slate-900">{row.payoutNumber}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      sortKey: 'status',
      cell: (row) => <PayoutStatusChip status={row.status} />,
    },
    {
      id: 'prepared',
      header: 'Prepared',
      sortKey: 'preparedAt',
      firstSort: 'desc',
      cell: (row) => formatLocalDate(row.preparedAt),
    },
    {
      id: 'paid',
      header: 'Paid',
      sortKey: 'paidAt',
      firstSort: 'desc',
      cell: (row) => formatLocalDate(row.paidAt),
    },
    {
      id: 'vets',
      header: 'Vets',
      sortKey: 'vetCount',
      firstSort: 'desc',
      align: 'right',
      cell: (row) => row.vetCount.toLocaleString(),
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
      id: 'amount',
      header: 'Total',
      sortKey: 'totalAmount',
      firstSort: 'desc',
      align: 'right',
      cell: (row) => <MoneyCell value={row.totalAmount} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (row) =>
        row.status === 'PREPARED' ? (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onMarkPaid(row)}
              className="cursor-pointer text-sm font-medium text-[var(--portal-primary)] hover:underline"
            >
              Mark paid
            </button>
            <button
              type="button"
              onClick={() => onCancel(row)}
              className="cursor-pointer text-sm font-medium text-rose-700 hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <PeriodPicker value={span} onChange={onSpanChange} presets={PRESETS} label="Prepared in" />
        <SearchBox
          value={search}
          onSearch={onSearch}
          placeholder="Search payout number"
          className="min-w-[14rem] flex-1"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Status">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-500">Status</span>
        <FilterChip size="sm" label="All" pressed={status === ''} onClick={() => onStatusChange('')} />
        {PAYOUT_STATUSES.map((s) => (
          <FilterChip
            key={s}
            size="sm"
            label={PAYOUT_STATUS_LABELS[s as PayoutStatus]}
            pressed={status === s}
            onClick={() => onStatusChange(s)}
          />
        ))}
      </div>

      <DataTable
        caption="Prepared and paid payouts"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        fetching={fetching}
        error={error}
        onRetry={onRetry}
        sort={sort}
        onSortChange={onSortChange}
        onRowClick={onOpen}
        activeRowKey={activePayoutId}
        emptyState={
          <EmptyState
            title="No payouts in this period"
            description="Prepare a payout from the Ready to pay tab, or widen the period."
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
