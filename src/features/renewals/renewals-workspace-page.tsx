'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Loader2,
  MapPin,
  Percent,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import {
  fetchRenewalEligibleApplications,
  type RenewingApplicationSummary,
  type RenewalListFilters,
  type RenewalModule,
} from '@/features/renewals/renewal-api';
import {
  addDaysFromToday,
  classifyRenewalBucket,
  isPolicyExpired,
  motorPlateBlockedReason,
  normalizePlateNumber,
  startOfTodayIso,
  stillActivePolicyReason,
  yesterdayIso,
  type RenewalListBucket,
} from '@/features/renewals/renewal-eligibility';
import { renewalDiscountBearerLabel } from '@/features/renewals/renewal-pricing';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import {
  getDistrictNamesForProvince,
  getProvinceNames,
} from '@/features/livestock-application/utils/location';
import {
  INSURANCE_CATEGORY_FILTER_OPTIONS,
  insuranceCategoriesMatch,
} from '@/shared/insurance/categories';
import { useApiClient } from '@/utils/apiClient';

const PAGE_SIZE_OPTIONS = [10, 15, 25] as const;
const DEFAULT_TABS: RenewalListBucket[] = ['eligible', 'upcoming'];

export interface RenewalsWorkspacePageProps {
  module: RenewalModule;
  title: string;
  subtitle: string;
  /** Path used when the user clicks Renew, e.g. `/vet/livestock/renewals`. */
  formBasePath: string;
  /** Expiring follow-up pages can show upcoming only. */
  visibleTabs?: RenewalListBucket[];
  defaultTab?: RenewalListBucket;
  /**
   * Admin / finance / super-admin views: agent + location filters and columns.
   * Agents and vets stay scoped to their own book of business.
   */
  enableStaffFilters?: boolean;
}

function rowCanRenew(
  item: RenewingApplicationSummary,
  module: RenewalModule,
  activePlates: Set<string>,
): { allowed: boolean; reason?: string } {
  if (!isPolicyExpired(item.policyEndDate)) {
    return { allowed: false, reason: stillActivePolicyReason(item.policyEndDate) };
  }
  if (module !== 'motor') return { allowed: true };

  const plate = normalizePlateNumber(item.plateNumber);
  const blockedByFlag =
    item.hasActiveInsuranceForPlate === true || item.canRenew === false;
  const blockedByKnownActivePlate = Boolean(plate) && activePlates.has(plate);
  if (blockedByFlag || blockedByKnownActivePlate) {
    return { allowed: false, reason: motorPlateBlockedReason(item.plateNumber) };
  }
  return { allowed: true };
}

function expiryLabel(daysUntilExpiry: number | undefined): string {
  if (daysUntilExpiry == null) return '';
  const abs = Math.abs(daysUntilExpiry);
  const unit = abs === 1 ? 'day' : 'days';
  return daysUntilExpiry < 0 ? `${abs} ${unit} ago` : `in ${abs} ${unit}`;
}

function locationSummary(item: RenewingApplicationSummary): string {
  return [item.district, item.province].filter(Boolean).join(', ') || '—';
}

function emptyFilters(): RenewalListFilters {
  return {
    insuranceCategory: '',
    agentId: '',
    province: '',
    district: '',
  };
}

export function RenewalsWorkspacePage({
  module,
  title,
  subtitle,
  formBasePath,
  visibleTabs = DEFAULT_TABS,
  defaultTab,
  enableStaffFilters = false,
}: RenewalsWorkspacePageProps) {
  const { apiFetch } = useApiClient();
  const tabs = useMemo<RenewalListBucket[]>(
    () => (visibleTabs?.length ? visibleTabs : DEFAULT_TABS),
    [visibleTabs],
  );
  const [activeTab, setActiveTab] = useState<RenewalListBucket>(() => {
    if (defaultTab && tabs.includes(defaultTab)) return defaultTab;
    if (tabs.includes('eligible')) return 'eligible';
    return tabs[0];
  });
  const [upcomingRange, setUpcomingRange] = useState({
    startDate: startOfTodayIso(),
    endDate: addDaysFromToday(30),
  });
  const [eligibleRange, setEligibleRange] = useState({
    startDate: addDaysFromToday(-730),
    endDate: yesterdayIso(),
  });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<RenewalListFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [upcomingItems, setUpcomingItems] = useState<RenewingApplicationSummary[]>([]);
  const [eligibleItems, setEligibleItems] = useState<RenewingApplicationSummary[]>([]);
  const [knownActivePlates, setKnownActivePlates] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const includeUpcoming = tabs.includes('upcoming');
  const includeEligible = tabs.includes('eligible');
  const showCategoryFilter = module === 'motor';
  const showStaffFilters = enableStaffFilters;

  const apiFilters = useMemo<RenewalListFilters | undefined>(() => {
    const next: RenewalListFilters = {};
    if (filters.insuranceCategory) next.insuranceCategory = filters.insuranceCategory;
    if (showStaffFilters && filters.agentId) next.agentId = filters.agentId;
    if (showStaffFilters && filters.province) next.province = filters.province;
    if (showStaffFilters && filters.district) next.district = filters.district;
    return Object.keys(next).length ? next : undefined;
  }, [filters, showStaffFilters]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [upcomingRows, expiredRows, inForceRows] = await Promise.all([
        includeUpcoming
          ? fetchRenewalEligibleApplications(
              apiFetch,
              module,
              upcomingRange.startDate,
              upcomingRange.endDate,
              'upcoming',
              apiFilters,
            )
          : Promise.resolve([]),
        includeEligible
          ? fetchRenewalEligibleApplications(
              apiFetch,
              module,
              eligibleRange.startDate,
              eligibleRange.endDate,
              'eligible',
              apiFilters,
            )
          : Promise.resolve([]),
        module === 'motor' && includeEligible
          ? fetchRenewalEligibleApplications(
              apiFetch,
              module,
              startOfTodayIso(),
              addDaysFromToday(400),
              'upcoming',
            )
          : Promise.resolve([]),
      ]);

      setUpcomingItems(
        upcomingRows.filter((row) => classifyRenewalBucket(row.policyEndDate) === 'upcoming'),
      );
      setEligibleItems(expiredRows.filter((row) => isPolicyExpired(row.policyEndDate)));

      const plates = new Set<string>();
      for (const row of [...inForceRows, ...upcomingRows]) {
        if (isPolicyExpired(row.policyEndDate)) continue;
        const plate = normalizePlateNumber(row.plateNumber);
        if (plate) plates.add(plate);
      }
      setKnownActivePlates(plates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load renewals.');
      setUpcomingItems([]);
      setEligibleItems([]);
      setKnownActivePlates(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [
    apiFetch,
    apiFilters,
    eligibleRange.endDate,
    eligibleRange.startDate,
    includeEligible,
    includeUpcoming,
    module,
    upcomingRange.endDate,
    upcomingRange.startDate,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = activeTab === 'eligible' ? eligibleItems : upcomingItems;

  const agentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of [...upcomingItems, ...eligibleItems]) {
      if (item.agent?._id) map.set(item.agent._id, item.agent.fullName);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [eligibleItems, upcomingItems]);

  const provinceOptions = useMemo(() => getProvinceNames(), []);
  const districtOptions = useMemo(
    () => (filters.province ? getDistrictNamesForProvince(filters.province) : []),
    [filters.province],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const haystack = [
          item.applicationNumber,
          item.clientName,
          item.phone,
          item.email,
          item.plateNumber,
          item.insuranceCategory,
          item.agent?.fullName,
          item.province,
          item.district,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Client-side fallback when API ignores filter params
      if (
        filters.insuranceCategory &&
        item.insuranceCategory &&
        !insuranceCategoriesMatch(item.insuranceCategory, filters.insuranceCategory)
      ) {
        return false;
      }
      if (filters.insuranceCategory && !item.insuranceCategory) return false;
      if (showStaffFilters && filters.agentId && item.agent?._id !== filters.agentId) {
        return false;
      }
      if (
        showStaffFilters &&
        filters.province &&
        (item.province ?? '').toLowerCase() !== filters.province.toLowerCase()
      ) {
        return false;
      }
      if (
        showStaffFilters &&
        filters.district &&
        (item.district ?? '').toLowerCase() !== filters.district.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [filters, items, search, showStaffFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSize, safePage]);

  useEffect(() => {
    setPage(1);
  }, [
    activeTab,
    search,
    pageSize,
    upcomingRange.startDate,
    upcomingRange.endDate,
    eligibleRange.startDate,
    eligibleRange.endDate,
    filters.insuranceCategory,
    filters.agentId,
    filters.province,
    filters.district,
  ]);

  const range = activeTab === 'eligible' ? eligibleRange : upcomingRange;
  const setRange = activeTab === 'eligible' ? setEligibleRange : setUpcomingRange;
  const showTabs = tabs.length > 1;
  const canRenewOnThisTab = activeTab === 'eligible';
  const from = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, filtered.length);

  const showCategoryColumn = module === 'motor';
  const showAgentColumn = showStaffFilters;
  const showLocationColumn = showStaffFilters;
  const colCount =
    5 +
    (showCategoryColumn ? 1 : 0) +
    (showAgentColumn ? 1 : 0) +
    (showLocationColumn ? 1 : 0) +
    (canRenewOnThisTab ? 1 : 0);

  const hasActiveFilters = Boolean(
    filters.insuranceCategory ||
      filters.agentId ||
      filters.province ||
      filters.district,
  );

  const clearFilters = () => setFilters(emptyFilters());

  const producerLabel = module === 'livestock' ? 'Vet' : 'Agent';

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Renewals
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">{subtitle}</p>

            {showTabs && (
              <div
                className="mt-6 inline-flex w-full max-w-xl rounded-xl border border-slate-200 bg-slate-100/80 p-1"
                role="tablist"
                aria-label="Renewal lists"
              >
                {tabs.map((tab) => {
                  const selected = activeTab === tab;
                  const count = tab === 'eligible' ? eligibleItems.length : upcomingItems.length;
                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveTab(tab)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                        selected
                          ? 'bg-white text-[var(--main-blue)] shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab === 'eligible' ? (
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                      ) : (
                        <CalendarClock className="h-4 w-4 shrink-0" />
                      )}
                      <span className="truncate">
                        {tab === 'eligible' ? 'Eligible for renewal' : 'Upcoming renewals'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          selected ? 'bg-blue-50 text-[var(--main-blue)]' : 'bg-white/80 text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <label className="text-xs font-medium text-slate-600">
                {activeTab === 'eligible' ? 'Expired from' : 'Expiring from'}
                <input
                  type="date"
                  value={range.startDate}
                  max={activeTab === 'eligible' ? yesterdayIso() : undefined}
                  min={activeTab === 'upcoming' ? startOfTodayIso() : undefined}
                  onChange={(e) => setRange((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                To
                <input
                  type="date"
                  value={range.endDate}
                  max={activeTab === 'eligible' ? yesterdayIso() : undefined}
                  min={activeTab === 'upcoming' ? startOfTodayIso() : undefined}
                  onChange={(e) => setRange((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <div className="relative min-w-[16rem] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    module === 'motor'
                      ? 'Search client, phone, email, application, plate…'
                      : 'Search client, phone, email, application…'
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <Button type="button" variant="outline" onClick={() => void load()} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>

            {(showCategoryFilter || showStaffFilters) && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Filter className="h-3.5 w-3.5" />
                    Refine results
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {showCategoryFilter && (
                    <label className="text-xs font-medium text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        Insurance category
                      </span>
                      <select
                        value={filters.insuranceCategory ?? ''}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, insuranceCategory: e.target.value }))
                        }
                        className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">All categories</option>
                        {INSURANCE_CATEGORY_FILTER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {showStaffFilters && (
                    <>
                      <label className="text-xs font-medium text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5 text-slate-400" />
                          {producerLabel}
                        </span>
                        <select
                          value={filters.agentId ?? ''}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, agentId: e.target.value }))
                          }
                          className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">All {producerLabel.toLowerCase()}s</option>
                          {agentOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-medium text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          Province
                        </span>
                        <select
                          value={filters.province ?? ''}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              province: e.target.value,
                              district: '',
                            }))
                          }
                          className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">All provinces</option>
                          {provinceOptions.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-medium text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          District
                        </span>
                        <select
                          value={filters.district ?? ''}
                          disabled={!filters.province}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, district: e.target.value }))
                          }
                          className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="">
                            {filters.province ? 'All districts' : 'Select province first'}
                          </option>
                          {districtOptions.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}
          </header>

          {error && (
            <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {activeTab === 'eligible' ? 'Eligible applications' : 'Upcoming renewals'}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {activeTab === 'eligible'
                    ? module === 'motor'
                      ? 'Expired policies. Renew is blocked if the same plate still has active cover.'
                      : 'Expired applications that can be renewed now.'
                    : 'Cover is still in force. Follow up now; Renew appears after expiry.'}
                </p>
              </div>
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-800">{filtered.length}</span> result
                {filtered.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 sm:px-5">Application</th>
                    <th className="whitespace-nowrap px-4 py-3">Client</th>
                    <th className="whitespace-nowrap px-4 py-3">Contact</th>
                    {showCategoryColumn && (
                      <th className="whitespace-nowrap px-4 py-3">Category</th>
                    )}
                    {showAgentColumn && (
                      <th className="whitespace-nowrap px-4 py-3">{producerLabel}</th>
                    )}
                    {showLocationColumn && (
                      <th className="whitespace-nowrap px-4 py-3">Location</th>
                    )}
                    <th className="whitespace-nowrap px-4 py-3">
                      {activeTab === 'eligible' ? 'Expired' : 'Expires'}
                    </th>
                    <th className="whitespace-nowrap px-4 py-3">Net premium</th>
                    {canRenewOnThisTab && (
                      <th className="sticky right-0 z-20 min-w-[9.5rem] bg-slate-50 px-4 py-3 text-right shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.35)]">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading &&
                    Array.from({ length: 6 }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className="animate-pulse">
                        {Array.from({ length: colCount }).map((__, cell) => (
                          <td key={cell} className="px-4 py-4">
                            <div className="h-4 w-24 rounded bg-slate-100" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  {!isLoading &&
                    paged.map((item) => {
                      const gate = rowCanRenew(item, module, knownActivePlates);
                      return (
                        <tr key={item._id} className="group hover:bg-slate-50/90">
                          <td className="px-4 py-3.5 sm:px-5">
                            <p className="font-medium text-slate-900">{item.applicationNumber}</p>
                            {item.plateNumber ? (
                              <p className="mt-0.5 font-mono text-xs text-slate-500">{item.plateNumber}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-slate-900">{item.clientName}</td>
                          <td className="px-4 py-3.5 text-slate-700">
                            {item.phone ? <p>{item.phone}</p> : null}
                            {item.email ? <p className="text-xs text-slate-500">{item.email}</p> : null}
                            {!item.phone && !item.email ? (
                              <p className="text-xs text-slate-400">No contact on file</p>
                            ) : null}
                          </td>
                          {showCategoryColumn && (
                            <td className="px-4 py-3.5 text-slate-700">
                              {item.insuranceCategory ?? '—'}
                            </td>
                          )}
                          {showAgentColumn && (
                            <td className="px-4 py-3.5 text-slate-700">
                              {item.agent?.fullName ?? (
                                <span className="text-xs text-slate-400">Company / unassigned</span>
                              )}
                            </td>
                          )}
                          {showLocationColumn && (
                            <td className="px-4 py-3.5 text-slate-700">
                              <span className="inline-flex items-start gap-1.5">
                                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span>{locationSummary(item)}</span>
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3.5 text-slate-700">
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {item.policyEndDate.slice(0, 10)}
                            </span>
                            {item.daysUntilExpiry != null && (
                              <p className="mt-0.5 text-xs text-slate-500">
                                {expiryLabel(item.daysUntilExpiry)}
                              </p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-medium text-slate-900">
                            {formatRwfDisplay(item.netPremium)}
                          </td>
                          {canRenewOnThisTab && (
                            <td className="sticky right-0 z-10 bg-white px-4 py-3 text-right shadow-[-10px_0_12px_-12px_rgba(15,23,42,0.28)] group-hover:bg-slate-50">
                              {gate.allowed ? (
                                <Link
                                  href={`${formBasePath}/${item._id}`}
                                  prefetch
                                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--portal-primary)] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--portal-primary-hover)]"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  Renew
                                </Link>
                              ) : (
                                <span
                                  className="inline-flex max-w-[10.5rem] rounded-full bg-amber-50 px-2.5 py-1 text-left text-[11px] font-medium leading-snug text-amber-800"
                                  title={gate.reason}
                                >
                                  {module === 'motor' ? 'Active cover on plate' : 'Not eligible yet'}
                                </span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  {!isLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={colCount} className="px-4 py-16 text-center">
                        <p className="font-medium text-slate-800">No applications in this view</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {activeTab === 'eligible'
                            ? 'No expired applications match this date range or filters.'
                            : 'No upcoming renewals match this date range or filters.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <label className="inline-flex items-center gap-2">
                    <span>Show</span>
                    <select
                      value={pageSize}
                      onChange={(e) =>
                        setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <span>per page</span>
                  </label>
                  <p>
                    Showing <span className="font-semibold text-slate-900">{from}</span>–
                    <span className="font-semibold text-slate-900">{to}</span> of{' '}
                    <span className="font-semibold text-slate-900">{filtered.length}</span>
                  </p>
                </div>
                <nav className="isolate inline-flex -space-x-px rounded-lg shadow-sm" aria-label="Pagination">
                  <PaginationButton
                    disabled={safePage <= 1}
                    onClick={() => setPage(1)}
                    className="rounded-l-lg"
                    label="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </PaginationButton>
                  <PaginationButton
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                    label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </PaginationButton>
                  {getVisiblePages(safePage, totalPages).map((item, index) =>
                    item === '...' ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="inline-flex items-center border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item)}
                        aria-current={item === safePage ? 'page' : undefined}
                        className={`relative inline-flex items-center border px-3 py-2 text-sm font-medium ${
                          item === safePage
                            ? 'z-10 border-[var(--main-blue)] bg-[var(--main-blue)] text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                  <PaginationButton
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(safePage + 1)}
                    label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </PaginationButton>
                  <PaginationButton
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(totalPages)}
                    className="rounded-r-lg"
                    label="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </PaginationButton>
                </nav>
              </div>
            )}
          </section>

          <aside className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">How renewal works</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-950">
                <p className="inline-flex items-center gap-2 text-sm font-semibold">
                  <Percent className="h-4 w-4" />
                  1% renewal discount
                </p>
                <p className="mt-1 text-xs leading-relaxed text-blue-900/90">
                  Clients receive 1% off net premium. That amount is deducted from{' '}
                  <strong>company commission</strong> by default. If an{' '}
                  {module === 'livestock' ? 'vet' : 'agent'} brought the application, it is deducted
                  from the {renewalDiscountBearerLabel('agent', module)} instead. The server
                  recalculates stored figures on submit.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Upcoming</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Cover is still in force. Use this list to follow up. The Renew action stays
                  hidden until the policy expires.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Eligible</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Cover has ended.
                  {module === 'motor'
                    ? ' Motor renewals are blocked if the same plate already has another active policy.'
                    : ' Livestock renewals are allowed only for that expired application.'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}

function PaginationButton({
  disabled,
  onClick,
  children,
  className = '',
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={`relative inline-flex items-center border border-slate-200 bg-white px-2.5 py-2 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      <span className="sr-only">{label}</span>
      {children}
    </button>
  );
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
