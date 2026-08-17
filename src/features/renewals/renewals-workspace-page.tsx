'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  CalendarClock,
  Loader2,
  Percent,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import {
  buildLocalRenewalPreview,
  fetchRenewalEligibleApplications,
  plateHasActiveMotorInsurance,
  type RenewingApplicationSummary,
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
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { useApiClient } from '@/utils/apiClient';

export interface RenewalsWorkspacePageProps {
  module: RenewalModule;
  title: string;
  subtitle: string;
  /** Path used when the user clicks Renew, e.g. `/vet/livestock/renewals`. */
  formBasePath: string;
  /** Expiring follow-up pages can show upcoming only. */
  visibleTabs?: RenewalListBucket[];
  defaultTab?: RenewalListBucket;
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

export function RenewalsWorkspacePage({
  module,
  title,
  subtitle,
  formBasePath,
  visibleTabs = ['upcoming', 'eligible'],
  defaultTab,
}: RenewalsWorkspacePageProps) {
  const router = useRouter();
  const { apiFetch } = useApiClient();
  const tabs = useMemo<RenewalListBucket[]>(
    () => (visibleTabs?.length ? visibleTabs : ['upcoming', 'eligible']),
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
  const [upcomingItems, setUpcomingItems] = useState<RenewingApplicationSummary[]>([]);
  const [eligibleItems, setEligibleItems] = useState<RenewingApplicationSummary[]>([]);
  const [knownActivePlates, setKnownActivePlates] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);

  const includeUpcoming = tabs.includes('upcoming');
  const includeEligible = tabs.includes('eligible');

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
            )
          : Promise.resolve([]),
        includeEligible
          ? fetchRenewalEligibleApplications(
              apiFetch,
              module,
              eligibleRange.startDate,
              eligibleRange.endDate,
              'eligible',
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

      const splitUpcoming = upcomingRows.filter(
        (row) => classifyRenewalBucket(row.policyEndDate) === 'upcoming',
      );
      const splitExpired = expiredRows.filter((row) => isPolicyExpired(row.policyEndDate));

      setUpcomingItems(splitUpcoming);
      setEligibleItems(splitExpired);

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

  const activePlates = knownActivePlates;

  const items = activeTab === 'eligible' ? eligibleItems : upcomingItems;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.applicationNumber.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        (item.phone ?? '').toLowerCase().includes(q) ||
        (item.email ?? '').toLowerCase().includes(q) ||
        (item.plateNumber ?? '').toLowerCase().includes(q),
    );
  }, [items, search]);

  const range = activeTab === 'eligible' ? eligibleRange : upcomingRange;
  const setRange = activeTab === 'eligible' ? setEligibleRange : setUpcomingRange;

  const openRenewalForm = async (item: RenewingApplicationSummary) => {
    setActionError(null);
    const gate = rowCanRenew(item, module, activePlates);
    if (!gate.allowed) {
      setActionError(gate.reason ?? stillActivePolicyReason(item.policyEndDate));
      return;
    }

    if (module === 'motor' && item.plateNumber) {
      setRenewingId(item._id);
      try {
        const active = await plateHasActiveMotorInsurance(apiFetch, item.plateNumber, item._id);
        if (active) {
          setActionError(motorPlateBlockedReason(item.plateNumber));
          return;
        }
      } finally {
        setRenewingId(null);
      }
    }

    router.push(`${formBasePath}/${item._id}`);
  };

  const showTabs = tabs.length > 1;
  const canRenewOnThisTab = activeTab === 'eligible';

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
              Renewals
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{subtitle}</p>

            {showTabs && (
              <div
                className="mt-6 flex rounded-2xl border border-slate-200 bg-slate-50 p-1"
                role="tablist"
                aria-label="Renewal lists"
              >
                {tabs.includes('upcoming') && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'upcoming'}
                    onClick={() => setActiveTab('upcoming')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      activeTab === 'upcoming'
                        ? 'bg-white text-[var(--main-blue)] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CalendarClock className="h-4 w-4" />
                    Upcoming renewals
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {upcomingItems.length}
                    </span>
                  </button>
                )}
                {tabs.includes('eligible') && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'eligible'}
                    onClick={() => setActiveTab('eligible')}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      activeTab === 'eligible'
                        ? 'bg-white text-[var(--main-blue)] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Eligible for renewal
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {eligibleItems.length}
                    </span>
                  </button>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-end gap-3">
              <label className="text-xs font-medium text-slate-600">
                {activeTab === 'eligible' ? 'Expired from' : 'Expiring from'}
                <input
                  type="date"
                  value={range.startDate}
                  max={activeTab === 'eligible' ? yesterdayIso() : undefined}
                  min={activeTab === 'upcoming' ? startOfTodayIso() : undefined}
                  onChange={(e) => setRange((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
                  className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm"
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
          </header>

          {error && (
            <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {actionError && (
            <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{actionError}</p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-3">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  {activeTab === 'eligible'
                    ? `Expired applications (${filtered.length})`
                    : `Upcoming renewals (${filtered.length})`}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {activeTab === 'eligible'
                    ? module === 'motor'
                      ? 'Only expired policies without another active cover on the same plate can be renewed.'
                      : 'Only expired livestock applications can be renewed.'
                    : 'These policies are still in force. Follow up now; renewal opens after the cover expires.'}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Application</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">
                        {activeTab === 'eligible' ? 'Expired' : 'Expires'}
                      </th>
                      <th className="px-4 py-3">Net premium</th>
                      {canRenewOnThisTab && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((item) => {
                      const gate = rowCanRenew(item, module, activePlates);
                      return (
                        <tr key={item._id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {item.applicationNumber}
                            {item.plateNumber && (
                              <p className="text-xs text-slate-500">{item.plateNumber}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <p className="font-medium text-slate-900">{item.clientName}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {item.phone ? <p>{item.phone}</p> : null}
                            {item.email ? <p className="text-xs text-slate-500">{item.email}</p> : null}
                            {!item.phone && !item.email ? (
                              <p className="text-xs text-slate-400">No contact on file</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {item.policyEndDate.slice(0, 10)}
                            </span>
                            {item.daysUntilExpiry != null && (
                              <p className="text-xs text-slate-500">
                                {item.daysUntilExpiry < 0
                                  ? `${Math.abs(item.daysUntilExpiry)} day${
                                      Math.abs(item.daysUntilExpiry) === 1 ? '' : 's'
                                    } ago`
                                  : `${item.daysUntilExpiry} day${item.daysUntilExpiry === 1 ? '' : 's'}`}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">{formatRwfDisplay(item.netPremium)}</td>
                          {canRenewOnThisTab && (
                            <td className="px-4 py-3 text-right">
                              {gate.allowed ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="primary"
                                  disabled={renewingId === item._id}
                                  onClick={() => void openRenewalForm(item)}
                                >
                                  {renewingId === item._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Renew'
                                  )}
                                </Button>
                              ) : (
                                <p className="max-w-[12rem] text-xs leading-snug text-amber-800" title={gate.reason}>
                                  {module === 'motor' ? 'Active cover on this plate' : 'Not eligible yet'}
                                </p>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {!isLoading && filtered.length === 0 && (
                      <tr>
                        <td
                          colSpan={canRenewOnThisTab ? 6 : 5}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          {activeTab === 'eligible'
                            ? 'No expired applications are eligible for renewal in this range.'
                            : 'No upcoming renewals found for this range.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <h2 className="text-lg font-semibold text-slate-900">How renewal works</h2>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-950">
                  <p className="inline-flex items-center gap-2 font-semibold">
                    <Percent className="h-4 w-4" />
                    1% renewal discount
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-blue-900/90">
                    Clients receive 1% off net premium. That amount is deducted from the
                    agent/vet commission. Renew only after the previous cover has expired.
                  </p>
                </div>
                <ul className="list-disc space-y-2 pl-4 text-xs leading-relaxed">
                  <li>
                    <strong>Upcoming</strong> — still in force. Use this list to follow up; the
                    Renew action is hidden.
                  </li>
                  <li>
                    <strong>Eligible</strong> — cover has ended.
                    {module === 'motor'
                      ? ' Motor renewals are blocked if the same plate already has another active policy.'
                      : ' Livestock renewals are allowed only for that expired application.'}
                  </li>
                </ul>
                {canRenewOnThisTab ? (
                  <p>Select Renew on an eligible row to open the full renewal form.</p>
                ) : tabs.includes('eligible') ? (
                  <p>
                    Switch to <strong>Eligible for renewal</strong> after a policy expires to
                    create the next cover.
                  </p>
                ) : (
                  <p>
                    Open <strong>Renewals</strong> after cover expires to create the next
                    policy.
                  </p>
                )}
                {filtered[0] && (
                  <dl className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex justify-between gap-3">
                      <dt>Indicative payment</dt>
                      <dd className="font-semibold text-slate-900">
                        {formatRwfDisplay(
                          buildLocalRenewalPreview(filtered[0]).expectedPaymentAmount,
                        )}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
