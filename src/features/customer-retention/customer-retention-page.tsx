'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { fetchClientInsuranceStats } from '@/features/customer-retention/customer-retention-api';
import { useApiClient } from '@/utils/apiClient';

export default function CustomerRetentionPage() {
  const { apiFetch } = useApiClient();
  const { showToast, ToastContainer } = useToast();
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = await fetchClientInsuranceStats(apiFetch);
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load client insurance stats';
      setData(null);
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--portal-primary-soft)] text-[var(--portal-primary)]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--portal-primary)]">
                Admin · Motor
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                Customer retention
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Raw response from <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/getClientInsuranceStats</code>.
                Share this payload so we can design the retention UI next.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => void loadStats()}
            disabled={isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </span>
            )}
          </Button>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3 sm:px-6">
            <h2 className="text-sm font-semibold text-slate-900">API response</h2>
          </div>

          <div className="p-5 sm:p-6">
            {isLoading && !data && !error ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--portal-primary)]" />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : (
              <pre className="max-h-[70vh] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-relaxed text-slate-100 sm:text-sm">
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
          </div>
        </section>
      </div>

      <ToastContainer />
    </div>
  );
}
