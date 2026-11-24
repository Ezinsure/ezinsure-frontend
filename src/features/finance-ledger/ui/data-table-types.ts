import type { ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc';
export type Breakpoint = 'sm' | 'md' | 'lg';

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Server field to sort by. Columns without one are not sortable. */
  sortKey?: string;
  /** Direction on the first click. Dates and amounts usually want `desc`. */
  firstSort?: SortDirection;
  align?: 'left' | 'right' | 'center';
  /** Extra classes for both the header and body cells (e.g. a width). */
  className?: string;
  /** Hide this column on screens narrower than the breakpoint. */
  hideBelow?: Breakpoint;
}

/** Parses the API's `sort` string (`-paidAt`) for a single column. */
export function sortDirectionFor(sort: string | undefined, sortKey: string): SortDirection | undefined {
  const first = sort?.split(',')[0];
  if (first === sortKey) return 'asc';
  if (first === `-${sortKey}`) return 'desc';
  return undefined;
}

/** The `sort` value after clicking a column header. */
export function nextSort(sort: string | undefined, column: Pick<Column<unknown>, 'sortKey' | 'firstSort'>): string {
  const key = column.sortKey as string;
  const current = sortDirectionFor(sort, key);
  const direction: SortDirection = current
    ? current === 'asc' ? 'desc' : 'asc'
    : column.firstSort ?? 'asc';
  return direction === 'desc' ? `-${key}` : key;
}
