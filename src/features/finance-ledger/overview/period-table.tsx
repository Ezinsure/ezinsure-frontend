import { formatMoney } from '@/utils/money';
import { overdueLevel, parseDateOnly, sumAmounts, type PeriodSummaryRow } from '../domain';
import { cx } from '../ui/cx';
import { DataTable } from '../ui/data-table';
import type { Column } from '../ui/data-table-types';
import { MoneyCell } from '../ui/money-cell';
import { EmptyState } from '../ui/state-panels';
import { StatusChip } from '../ui/status-chip';
import { periodHealth } from './period-health';

const monthLabel = (row: PeriodSummaryRow): string =>
  parseDateOnly(row.from).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

const AGE_TEXT = { ok: 'text-slate-600', warning: 'text-amber-700', critical: 'text-rose-700 font-medium' };

const COLUMNS: Column<PeriodSummaryRow>[] = [
  {
    id: 'month',
    header: 'Month',
    cell: (row) => (
      <div>
        <p className="font-medium text-slate-900">{monthLabel(row)}</p>
        <p className="text-xs text-slate-500">{row.statementNumber ?? 'No statement yet'}</p>
      </div>
    ),
  },
  {
    id: 'paid',
    header: 'Paid to vets',
    align: 'right',
    cell: (row) => (
      <div>
        <MoneyCell value={row.paidToVetsAmount} dashForZero />
        {row.paidLineCount > 0 ? (
          <p className="text-right text-xs text-slate-500">{row.paidLineCount} lines</p>
        ) : null}
      </div>
    ),
  },
  { id: 'billed', header: 'Billed', align: 'right', cell: (row) => <MoneyCell value={row.billedAmount} dashForZero /> },
  { id: 'received', header: 'Received', align: 'right', cell: (row) => <MoneyCell value={row.receivedAmount} dashForZero /> },
  {
    id: 'owed',
    header: 'Still owed',
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
    id: 'status',
    header: 'Status',
    cell: (row) => {
      const health = periodHealth(row);
      return <StatusChip label={health.label} tone={health.tone} description={health.description} />;
    },
  },
  {
    id: 'age',
    header: 'Waiting',
    align: 'right',
    hideBelow: 'md',
    cell: (row) =>
      row.ageDays !== undefined && row.outstandingAmount > 0 ? (
        <span className={cx('tabular-nums', AGE_TEXT[overdueLevel(row.ageDays)])}>{row.ageDays} days</span>
      ) : (
        <span className="text-slate-400">—</span>
      ),
  },
];

interface PeriodTableProps {
  rows: PeriodSummaryRow[] | undefined;
  loading: boolean;
  fetching: boolean;
  error: string | undefined;
  onRetry: () => void;
}

function TotalsRow({ rows }: { rows: PeriodSummaryRow[] }) {
  const total = (pick: (row: PeriodSummaryRow) => number) => formatMoney(sumAmounts(rows.map(pick)));
  const cell = 'px-3 py-2.5 text-right tabular-nums whitespace-nowrap';
  return (
    <tr>
      <td className="px-3 py-2.5">Total</td>
      <td className={cell}>{total((r) => r.paidToVetsAmount)}</td>
      <td className={cell}>{total((r) => r.billedAmount)}</td>
      <td className={cell}>{total((r) => r.receivedAmount)}</td>
      <td className={cell}>{total((r) => r.outstandingAmount)}</td>
      <td />
      <td className="hidden md:table-cell" />
    </tr>
  );
}

/** One row per month: what we paid, billed, received and still wait for. */
export function PeriodTable({ rows, loading, fetching, error, onRetry }: PeriodTableProps) {
  return (
    <DataTable
      caption="Money paid to vets, billed to SONARWA and received, month by month"
      columns={COLUMNS}
      rows={rows}
      rowKey={(row) => row.periodKey}
      loading={loading}
      fetching={fetching}
      error={error}
      onRetry={onRetry}
      skeletonRows={5}
      emptyState={
        <EmptyState
          title="No activity in this period"
          description="Choose a longer period to see earlier months."
        />
      }
      footer={rows && rows.length > 1 ? <TotalsRow rows={rows} /> : undefined}
    />
  );
}
