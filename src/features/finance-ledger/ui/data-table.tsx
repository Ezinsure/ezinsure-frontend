'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import type { TableSelection } from '../hooks/use-table-selection';
import { cx } from './cx';
import { nextSort, sortDirectionFor, type Breakpoint, type Column } from './data-table-types';
import { ErrorState } from './state-panels';
import { Skeleton } from './skeleton';

const HIDE_BELOW: Record<Breakpoint, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};
const ALIGN: Record<NonNullable<Column<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};
const INTERACTIVE = 'a,button,input,select,textarea,label,[role="button"]';

interface DataTableProps<T> {
  columns: readonly Column<T>[];
  /** `undefined` until the first response arrives. */
  rows: readonly T[] | undefined;
  rowKey: (row: T) => string;
  /** Screen-reader description of the table. */
  caption: string;
  /** First load: shows skeleton rows. */
  loading?: boolean;
  /** Refreshing with rows already on screen: dims them instead of flashing a skeleton. */
  fetching?: boolean;
  error?: string;
  onRetry?: () => void;
  /** The API `sort` value, e.g. `-paidAt`. */
  sort?: string;
  onSortChange?: (sort: string) => void;
  /** Adds a checkbox column. */
  selection?: TableSelection;
  isRowSelectable?: (row: T) => boolean;
  onRowClick?: (row: T) => void;
  /** Highlights the row whose details are open. */
  activeRowKey?: string;
  /** Shown when `rows` is empty. */
  emptyState: ReactNode;
  /** Optional totals row rendered under the data. */
  footer?: ReactNode;
  skeletonRows?: number;
  className?: string;
}

function SortIcon({ direction }: { direction: 'asc' | 'desc' | undefined }) {
  if (direction === 'asc') return <ArrowUp aria-hidden className="h-3.5 w-3.5" />;
  if (direction === 'desc') return <ArrowDown aria-hidden className="h-3.5 w-3.5" />;
  return <ChevronsUpDown aria-hidden className="h-3.5 w-3.5 opacity-40" />;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  fetching = false,
  error,
  onRetry,
  sort,
  onSortChange,
  selection,
  isRowSelectable,
  onRowClick,
  activeRowKey,
  emptyState,
  footer,
  skeletonRows = 8,
  className,
}: DataTableProps<T>) {
  if (error) {
    return (
      <div className={cx('rounded-xl border border-slate-200 bg-white', className)}>
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }

  const selectable = (row: T) => (isRowSelectable ? isRowSelectable(row) : true);
  const pageIds = (rows ?? []).filter(selectable).map(rowKey);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selection?.isSelected(id));
  const someSelected = !allSelected && pageIds.some((id) => selection?.isSelected(id));
  const columnCount = columns.length + (selection ? 1 : 0);
  const isEmpty = !loading && rows !== undefined && rows.length === 0;

  const handleRowClick = (row: T) => (event: MouseEvent<HTMLTableRowElement>) => {
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    onRowClick?.(row);
  };
  const handleRowKey = (row: T) => (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick?.(row);
    }
  };

  return (
    <div className={cx('overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="overflow-x-auto">
        <table className={cx('min-w-full text-sm', fetching && 'opacity-60 transition-opacity')} aria-busy={fetching || loading}>
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {selection ? (
                <th scope="col" className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    disabled={pageIds.length === 0}
                    onChange={() => selection.togglePage(pageIds)}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300"
                  />
                </th>
              ) : null}
              {columns.map((column) => {
                const direction = column.sortKey ? sortDirectionFor(sort, column.sortKey) : undefined;
                const sortable = Boolean(column.sortKey && onSortChange);
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined}
                    className={cx(
                      'whitespace-nowrap px-3 py-2.5 font-semibold',
                      ALIGN[column.align ?? 'left'],
                      column.hideBelow && HIDE_BELOW[column.hideBelow],
                      column.className,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onSortChange?.(nextSort(sort, column))}
                        className={cx(
                          'inline-flex cursor-pointer items-center gap-1 uppercase tracking-wide hover:text-slate-900',
                          column.align === 'right' && 'flex-row-reverse',
                          direction && 'text-slate-900',
                        )}
                      >
                        {column.header}
                        <SortIcon direction={direction} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading
              ? Array.from({ length: skeletonRows }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={columnCount} className="px-3 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              : null}

            {isEmpty ? (
              <tr>
                <td colSpan={columnCount}>{emptyState}</td>
              </tr>
            ) : null}

            {!loading
              ? rows?.map((row) => {
                  const key = rowKey(row);
                  const checked = selection?.isSelected(key) ?? false;
                  return (
                    <tr
                      key={key}
                      onClick={onRowClick ? handleRowClick(row) : undefined}
                      onKeyDown={onRowClick ? handleRowKey(row) : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      aria-selected={checked || key === activeRowKey || undefined}
                      className={cx(
                        'transition-colors',
                        onRowClick && 'cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none',
                        (checked || key === activeRowKey) && 'bg-[var(--portal-primary-soft)]',
                      )}
                    >
                      {selection ? (
                        <td className="w-10 px-3 py-2.5">
                          <input
                            type="checkbox"
                            aria-label="Select row"
                            checked={checked}
                            disabled={!selectable(row)}
                            onChange={() => selection.toggle(key)}
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 disabled:cursor-not-allowed"
                          />
                        </td>
                      ) : null}
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className={cx(
                            'px-3 py-2.5 text-slate-700',
                            ALIGN[column.align ?? 'left'],
                            column.hideBelow && HIDE_BELOW[column.hideBelow],
                            column.className,
                          )}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              : null}
          </tbody>

          {footer && !loading && !isEmpty ? (
            <tfoot className="border-t border-slate-200 bg-slate-50 font-medium text-slate-800">{footer}</tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
