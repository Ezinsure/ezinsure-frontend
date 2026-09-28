'use client';

import { Calendar, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Optional trailing actions (export, reset, etc.). */
  actions?: React.ReactNode;
  onResetToMonth?: () => void;
};

/**
 * Shared date + search filter strip for livestock commission workbenches.
 */
export function WorkbenchDateFilters({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  actions,
  onResetToMonth,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            From
          </span>
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            To
          </span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </label>
        {onSearchChange ? (
          <label className="block md:col-span-2">
            <span className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Search className="h-3.5 w-3.5" aria-hidden />
              Search
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </label>
        ) : (
          <div className="hidden xl:block" />
        )}
      </div>
      {(actions || onResetToMonth) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {onResetToMonth ? (
            <Button type="button" variant="outline" size="sm" onClick={onResetToMonth}>
              This month
            </Button>
          ) : null}
          {actions}
        </div>
      )}
    </div>
  );
}
