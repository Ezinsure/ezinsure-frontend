'use client';

import { Calendar, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getDefaultApplicationsListFilters,
  hasActiveListFilters,
  LIST_STATUS_FILTER_OPTIONS,
  PAYMENT_FILTER_OPTIONS,
  statusFilterLabel,
  type ApplicationsListFilters,
} from '@/features/livestock-application/utils/applications-list-filters';
import { speciesGroupLabel } from '@/features/livestock-application/domain/form-profiles';
import type {
  LivestockApplicationViewRole,
  LivestockSpeciesGroup,
} from '@/features/livestock-application/domain/application-types';

const SPECIES_OPTIONS: LivestockSpeciesGroup[] = ['CATTLE', 'POULTRY', 'PIG'];

const selectClassName =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

interface ApplicationsListFiltersBarProps {
  filters: ApplicationsListFilters;
  startDate: string;
  endDate: string;
  maxEndDate: string;
  isLoading: boolean;
  viewRole?: LivestockApplicationViewRole;
  onFiltersChange: (next: ApplicationsListFilters) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRefresh: () => void;
}

export function ApplicationsListFiltersBar({
  filters,
  startDate,
  endDate,
  maxEndDate,
  isLoading,
  viewRole = 'vet',
  onFiltersChange,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
}: ApplicationsListFiltersBarProps) {
  const patch = (partial: Partial<ApplicationsListFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const clearFilters = () => {
    onFiltersChange(getDefaultApplicationsListFilters(viewRole));
  };

  const filtersActive = hasActiveListFilters(filters, viewRole);
  const isVet = viewRole === 'vet';
  const isFinance = viewRole === 'finance';

  const financeQuickFilters: { label: string; patch: Partial<ApplicationsListFilters> }[] = [
    { label: 'Payment pending', patch: { paymentStatus: 'PENDING', status: 'ALL' } },
    { label: 'Proof submitted', patch: { paymentStatus: 'SUBMITTED', status: 'ALL' } },
    { label: 'Commission review', patch: { paymentStatus: 'ALL', status: 'PENDING_COMMISSION_REVIEW' } },
    { label: 'Ready to pay', patch: { paymentStatus: 'ALL', status: 'READY_TO_BE_PAID' } },
    { label: 'All payments', patch: { paymentStatus: 'ALL' } },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="relative lg:col-span-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder={
              isVet
                ? 'Search number, owner, location, status…'
                : 'Search number, owner, vet, location…'
            }
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Species</label>
          <select
            value={filters.speciesGroup}
            onChange={(e) => patch({ speciesGroup: e.target.value as ApplicationsListFilters['speciesGroup'] })}
            className={selectClassName}
          >
            <option value="ALL">All species</option>
            {SPECIES_OPTIONS.map((species) => (
              <option key={species} value={species}>
                {speciesGroupLabel(species)}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <select
            value={filters.status}
            onChange={(e) => patch({ status: e.target.value as ApplicationsListFilters['status'] })}
            className={selectClassName}
          >
            <option value="ALL">All statuses</option>
            {LIST_STATUS_FILTER_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {statusFilterLabel(status)}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Ownership</label>
          <select
            value={filters.ownerMode}
            onChange={(e) => patch({ ownerMode: e.target.value as ApplicationsListFilters['ownerMode'] })}
            className={selectClassName}
          >
            <option value="ALL">All ownership</option>
            <option value="SINGLE_OWNER">Single owner</option>
            <option value="MULTI_OWNER">Multi owner</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Payment</label>
          <select
            value={filters.paymentStatus}
            onChange={(e) =>
              patch({ paymentStatus: e.target.value as ApplicationsListFilters['paymentStatus'] })
            }
            className={selectClassName}
          >
            {PAYMENT_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isFinance && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <span className="self-center text-xs font-medium uppercase tracking-wide text-slate-500">
            Quick filters
          </span>
          {financeQuickFilters.map((item) => {
            const isActive =
              item.patch.paymentStatus === filters.paymentStatus &&
              (item.patch.status ?? filters.status) === filters.status;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => patch(item.patch)}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
        <div>
          <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
            <Calendar className="h-3.5 w-3.5" /> From
          </label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={maxEndDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <Button type="button" variant="outline" disabled={isLoading} onClick={onRefresh}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
            Clear filters
          </button>
        )}
      </div>

      {filtersActive && (
        <p className="mt-3 text-xs text-slate-500">
          Filters apply to the current page. Adjust the date range or paginate to browse other
          applications.
        </p>
      )}
    </div>
  );
}
