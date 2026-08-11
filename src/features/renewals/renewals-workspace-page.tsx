'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Loader2,
  Percent,
  RefreshCw,
  Search,
} from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import {
  buildLocalRenewalPreview,
  fetchRenewalEligibleApplications,
  submitRenewalApplication,
  type RenewingApplicationSummary,
  type RenewalModule,
} from '@/features/renewals/renewal-api';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { useApiClient } from '@/utils/apiClient';

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface RenewalsWorkspacePageProps {
  module: RenewalModule;
  title: string;
  subtitle: string;
}

export function RenewalsWorkspacePage({ module, title, subtitle }: RenewalsWorkspacePageProps) {
  const { apiFetch } = useApiClient();
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(() => addDaysIso(30));
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<RenewingApplicationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RenewingApplicationSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await fetchRenewalEligibleApplications(apiFetch, module, startDate, endDate);
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load renewals.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, endDate, module, startDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.applicationNumber.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        (item.plateNumber ?? '').toLowerCase().includes(q),
    );
  }, [items, search]);

  const preview = selected ? buildLocalRenewalPreview(selected) : null;

  const handleRenew = async () => {
    if (!selected || !preview) return;
    setIsSubmitting(true);
    setSuccessMessage(null);
    setError(null);
    try {
      const result = await submitRenewalApplication(apiFetch, {
        originalApplicationId: selected._id,
        module,
        discountAmount: preview.discountAmount,
        expectedPaymentAmount: preview.expectedPaymentAmount,
        agentCommissionAfterDiscount: preview.agentCommissionAfterDiscount,
      });
      setSuccessMessage(
        result.applicationNumber
          ? `Renewal created: ${result.applicationNumber}`
          : 'Renewal submitted successfully.',
      );
      setSelected(null);
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Renewal could not be created yet. Backend renewal API may still be pending.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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

            <div className="mt-6 flex flex-wrap items-end gap-3">
              <label className="text-xs font-medium text-slate-600">
                Expiring from
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                To
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="relative min-w-[16rem] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search client, application, plate…"
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
          {successMessage && (
            <div className="mt-4 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{successMessage}</p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-3">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Expiring applications ({filtered.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Application</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Expires</th>
                      <th className="px-4 py-3">Net premium</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {item.applicationNumber}
                          {item.plateNumber && (
                            <p className="text-xs text-slate-500">{item.plateNumber}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.clientName}</td>
                        <td className="px-4 py-3 text-slate-700">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {item.policyEndDate.slice(0, 10)}
                          </span>
                          {item.daysUntilExpiry != null && (
                            <p className="text-xs text-slate-500">
                              {item.daysUntilExpiry} day
                              {item.daysUntilExpiry === 1 ? '' : 's'}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">{formatRwfDisplay(item.netPremium)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant={selected?._id === item._id ? 'primary' : 'outline'}
                            onClick={() => setSelected(item)}
                          >
                            Renew
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!isLoading && filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                          No expiring applications found for this range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <h2 className="text-lg font-semibold text-slate-900">Renewal details</h2>
              {!selected || !preview ? (
                <p className="mt-3 text-sm text-slate-500">
                  Select an application and click Renew to see the 1% discount and expected payment.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Application</p>
                    <p className="mt-1 font-semibold text-slate-900">{selected.applicationNumber}</p>
                    <p className="text-sm text-slate-600">{selected.clientName}</p>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950">
                    <p className="inline-flex items-center gap-2 font-semibold">
                      <Percent className="h-4 w-4" />
                      1% renewal discount
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-blue-900/90">
                      Discount is 1% of net premium and is deducted from the agent&apos;s commission.
                      The client pays the same net premium minus this discount.
                    </p>
                  </div>

                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Net premium</dt>
                      <dd className="font-medium">{formatRwfDisplay(preview.netPremium)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Discount (1%)</dt>
                      <dd className="font-medium text-emerald-700">
                        −{formatRwfDisplay(preview.discountAmount)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-slate-100 pt-2">
                      <dt className="font-semibold text-slate-800">Expected payment</dt>
                      <dd className="font-bold text-slate-900">
                        {formatRwfDisplay(preview.expectedPaymentAmount)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Agent commission (before)</dt>
                      <dd>{formatRwfDisplay(preview.agentCommissionBeforeDiscount)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Agent commission (after discount)</dt>
                      <dd className="font-semibold">
                        {formatRwfDisplay(preview.agentCommissionAfterDiscount)}
                      </dd>
                    </div>
                  </dl>

                  <Button
                    type="button"
                    variant="primary"
                    className="w-full"
                    disabled={isSubmitting}
                    onClick={() => void handleRenew()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating renewal…
                      </>
                    ) : (
                      'Proceed with renewal'
                    )}
                  </Button>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
