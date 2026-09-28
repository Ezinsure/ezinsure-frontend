'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export interface LivestockApplicationsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  disabled?: boolean;
}

function getVisiblePages(currentPage: number, totalPages: number): (number | '...')[] {
  const maxVisible = 7;
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];
  let start = Math.max(2, currentPage - 2);
  let end = Math.min(totalPages - 1, currentPage + 2);

  if (currentPage <= 4) {
    start = 2;
    end = Math.min(6, totalPages - 1);
  }
  if (currentPage >= totalPages - 3) {
    start = Math.max(2, totalPages - 5);
    end = totalPages - 1;
  }
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push('...');
  pages.push(totalPages);

  return pages;
}

const pageButtonClass =
  'relative inline-flex cursor-pointer items-center px-3 py-2 text-sm font-medium ring-1 ring-inset ring-slate-200 transition-colors focus:z-20 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40';

export function LivestockApplicationsPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  disabled = false,
}: LivestockApplicationsPaginationProps) {
  if (totalItems === 0) return null;

  const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const from = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const to = Math.min(safePage * itemsPerPage, totalItems);
  const visiblePages = getVisiblePages(safePage, totalPages);

  return (
    <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <label htmlFor="ls-page-size">Show</label>
          <select
            id="ls-page-size"
            value={itemsPerPage}
            disabled={disabled}
            onChange={(e) => {
              onItemsPerPageChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>per page</span>
        </div>
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-900">{from}</span>–
          <span className="font-semibold text-slate-900">{to}</span> of{' '}
          <span className="font-semibold text-slate-900">{totalItems}</span> applications
        </p>
      </div>

      <nav className="isolate inline-flex -space-x-px rounded-lg shadow-sm" aria-label="Pagination">
        <button
          type="button"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(1)}
          className={`${pageButtonClass} rounded-l-lg text-slate-500 hover:bg-white`}
          title="First page"
        >
          <span className="sr-only">First page</span>
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className={`${pageButtonClass} text-slate-500 hover:bg-white`}
          title="Previous page"
        >
          <span className="sr-only">Previous page</span>
          <ChevronLeft className="h-4 w-4" />
        </button>

        {visiblePages.map((page, index) =>
          page === '...' ? (
            <span
              key={`ellipsis-${index}`}
              className={`${pageButtonClass} cursor-default bg-white px-3 text-slate-400`}
            >
              …
            </span>
          ) : (
            <button
              key={page}
              type="button"
              disabled={disabled}
              onClick={() => onPageChange(page)}
              aria-current={page === safePage ? 'page' : undefined}
              className={`${pageButtonClass} ${
                page === safePage
                  ? 'z-10 bg-blue-600 text-white ring-blue-600 hover:bg-blue-700'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {page}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={disabled || safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className={`${pageButtonClass} text-slate-500 hover:bg-white`}
          title="Next page"
        >
          <span className="sr-only">Next page</span>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={disabled || safePage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className={`${pageButtonClass} rounded-r-lg text-slate-500 hover:bg-white`}
          title="Last page"
        >
          <span className="sr-only">Last page</span>
          <ChevronsRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
