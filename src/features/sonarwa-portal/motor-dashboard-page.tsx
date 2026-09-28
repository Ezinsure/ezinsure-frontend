'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Car, FileCheck2, ReceiptText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApiClient } from '@/utils/apiClient';
import {
  getSonarwaBillingTotal,
  parseMonthlyCommissionSummary,
} from '@/utils/monthly-commission-summary';

interface RecentApplication {
  _id: string;
  applicationNumber: string;
  status: string;
  insuranceCategory?: string;
  insuranceType?: string;
  submittedAt?: string;
  client?: { fullName?: string } | null;
}

interface DistributionItem {
  category?: string;
  name?: string;
  count?: number;
  value?: number;
}

function monthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return { start: `${year}-${month}-01`, end: `${year}-${month}-${day}` };
}

function payloadData<T>(payload: unknown, fallback: T): T {
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    return ((payload as { data?: T }).data ?? fallback) as T;
  }
  return fallback;
}

export default function SonarwaMotorDashboardPage() {
  const { apiFetch } = useApiClient();
  const [applicationsThisMonth, setApplicationsThisMonth] = useState(0);
  const [billing, setBilling] = useState(0);
  const [recent, setRecent] = useState<RecentApplication[]>([]);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { start, end } = monthRange();
    setIsLoading(true);
    setError(null);

    try {
      const [countResponse, billingResponse, recentResponse, distributionResponse] =
        await Promise.all([
          apiFetch(`/countApplicationsThisMonth?startDate=${start}&endDate=${end}`),
          apiFetch(`/getTotalCompanyCommissionThisMonth?startDate=${start}&endDate=${end}`),
          apiFetch('/getRecentApplications'),
          apiFetch('/getInsuranceDistribution'),
        ]);

      if (![countResponse, billingResponse, recentResponse, distributionResponse].every((r) => r.ok)) {
        throw new Error('Some dashboard metrics are not available for this account.');
      }

      const [countPayload, billingPayload, recentPayload, distributionPayload] =
        await Promise.all([
          countResponse.json(),
          billingResponse.json(),
          recentResponse.json(),
          distributionResponse.json(),
        ]);

      setApplicationsThisMonth(Number(payloadData(countPayload, 0)) || 0);
      setBilling(getSonarwaBillingTotal(parseMonthlyCommissionSummary(billingPayload)));
      setRecent(payloadData<RecentApplication[]>(recentPayload, []).slice(0, 6));
      setDistribution(payloadData<DistributionItem[]>(distributionPayload, []));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load motor metrics.');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const insuredVehicles = distribution.reduce(
    (sum, item) => sum + (Number(item.count ?? item.value) || 0),
    0,
  );

  const cards = [
    {
      label: 'Applications this month',
      value: applicationsThisMonth.toLocaleString(),
      detail: 'Motor applications received',
      icon: FileCheck2,
    },
    {
      label: 'SONARWA billing',
      value: `${billing.toLocaleString()} RWF`,
      detail: 'Current monthly billing total',
      icon: ReceiptText,
    },
    {
      label: 'Insurance distribution',
      value: insuredVehicles.toLocaleString(),
      detail: `${distribution.length} recorded categories`,
      icon: BarChart3,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-[var(--sonarwa-primary)]" />
          <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--sonarwa-primary)]">
                SONARWA · Motor
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Motor insurance overview
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Read-only operational metrics. Motor applications and approval actions are not
                available in this workspace.
              </p>
            </div>
            <Button type="button" variant="outline" disabled={isLoading} onClick={() => void load()}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Motor summary">
          {cards.map(({ label, value, detail, icon: Icon }) => (
            <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--sonarwa-soft)] text-[var(--sonarwa-primary)]">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-5 text-sm font-medium text-slate-600">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">
                {isLoading ? '—' : value}
              </p>
              <p className="mt-2 text-xs text-slate-500">{detail}</p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <Car className="h-5 w-5 text-[var(--sonarwa-primary)]" />
            <div>
              <h2 className="font-semibold text-slate-950">Recent applications</h2>
              <p className="text-xs text-slate-500">Display only</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {!isLoading && recent.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No recent motor applications are available.
              </p>
            )}
            {recent.map((application) => (
              <div
                key={application._id}
                className="grid gap-1 px-5 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {application.applicationNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {application.client?.fullName || 'Client unavailable'}
                  </p>
                </div>
                <p className="text-sm text-slate-600">
                  {application.insuranceCategory || application.insuranceType || 'Motor insurance'}
                </p>
                <span className="w-fit rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {application.status?.replace(/_/g, ' ') || 'Unknown'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
