'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { MAX_PAGE_SIZE, type PageMeta } from '../domain';
import { cx } from './cx';

const DEFAULT_SIZES = [10, 25, 50, 100].filter((n) => n <= MAX_PAGE_SIZE);

interface PaginationProps {
  /** From the server's `meta`. Hidden until the first response arrives. */
  meta: PageMeta | undefined;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  /** Disable the controls while a request is running. */
  disabled?: boolean;
  className?: string;
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-slate-300 p-1.5 text-slate-600 enabled:cursor-pointer enabled:hover:bg-slate-50 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** Server-side pagination: "26–50 of 142", page size, first/previous/next/last. */
export function Pagination({
  meta,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_SIZES,
  disabled = false,
  className,
}: PaginationProps) {
  if (!meta) return null;
  const { page, pageSize, total, totalPages } = meta;
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cx('flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600', className)}
    >
      <p aria-live="polite">
        {total === 0 ? 'No results' : (
          <>
            <span className="font-medium text-slate-900">{first}–{last}</span> of{' '}
            <span className="font-medium text-slate-900">{total.toLocaleString()}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-3">
        {onPageSizeChange ? (
          <label className="flex items-center gap-2">
            <span className="text-slate-500">Rows</span>
            <select
              value={pageSize}
              disabled={disabled}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              {(pageSizeOptions.includes(pageSize) ? pageSizeOptions : [...pageSizeOptions, pageSize])
                .slice()
                .sort((a, b) => a - b)
                .map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
            </select>
          </label>
        ) : null}

        <div className="flex items-center gap-1">
          <PageButton label="First page" disabled={disabled || atStart} onClick={() => onPageChange(1)}>
            <ChevronsLeft className="h-4 w-4" />
          </PageButton>
          <PageButton label="Previous page" disabled={disabled || atStart} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </PageButton>
          <span className="px-2 tabular-nums">
            Page {page} of {totalPages}
          </span>
          <PageButton label="Next page" disabled={disabled || atEnd} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </PageButton>
          <PageButton label="Last page" disabled={disabled || atEnd} onClick={() => onPageChange(totalPages)}>
            <ChevronsRight className="h-4 w-4" />
          </PageButton>
        </div>
      </div>
    </nav>
  );
}
