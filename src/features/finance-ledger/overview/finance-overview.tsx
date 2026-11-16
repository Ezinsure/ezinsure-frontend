'use client';

import { RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toDateOnly, type FinanceModule } from '../domain';
import { useUrlState } from '../hooks/use-url-state';
import { resolvePeriodPreset, type PeriodPresetId } from '../period/presets';
import { PageHeader } from '../ui/page-header';
import { PeriodPicker } from '../ui/period-picker';
import { buildAttentionItems } from './attention';
import { AttentionPanel } from './attention-panel';
import { OverviewStats } from './overview-stats';
import { PeriodTable } from './period-table';
import { useOverviewData } from './use-overview-data';

const MODULE: FinanceModule = 'livestock';
const PRESETS: readonly PeriodPresetId[] = ['thisMonth', 'lastMonth', 'quarter', 'sixMonths', 'thisYear'];

const HOW_TO_READ = [
  ['Paid to vets', 'Commission we paid to vets this period.'],
  ['Billed', 'What we invoice SONARWA for those lines: vet commission + our commission + VAT.'],
  ['Received', 'What SONARWA has actually paid us.'],
  ['Still owed', 'Billed minus received. It should reach zero once SONARWA has paid in full.'],
] as const;

/** Finance Home: where the money stands, month by month, and what needs doing next. */
export function FinanceOverview() {
  const [defaults] = useState(() => {
    const span = resolvePeriodPreset('sixMonths');
    return { from: span.from, to: span.to };
  });
  const { values, setValues } = useUrlState(defaults);
  const { summary, counts, reload } = useOverviewData(MODULE, values);

  const attention = useMemo(
    () =>
      summary.data && counts.data
        ? buildAttentionItems({ summary: summary.data, ...counts.data, today: toDateOnly(new Date()) })
        : undefined,
    [summary.data, counts.data],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Finance overview"
        description="Livestock commissions: what we paid vets, what we billed SONARWA, and what SONARWA has paid back."
        actions={
          <button
            type="button"
            onClick={reload}
            disabled={summary.fetching || counts.fetching}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw aria-hidden className={`h-4 w-4 ${summary.fetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <PeriodPicker
        label="Period"
        presets={PRESETS}
        value={{ from: values.from, to: values.to }}
        onChange={(span) => setValues(span)}
      />

      <OverviewStats summary={summary.data} loading={summary.loading} />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <PeriodTable
            rows={summary.data?.rows}
            loading={summary.loading}
            fetching={summary.fetching}
            error={summary.error}
            onRetry={summary.reload}
          />
          <details className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-800">How to read this table</summary>
            <dl className="mt-2 space-y-1.5">
              {HOW_TO_READ.map(([term, meaning]) => (
                <div key={term}>
                  <dt className="inline font-medium text-slate-800">{term}: </dt>
                  <dd className="inline">{meaning}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>

        <AttentionPanel items={attention} loading={summary.loading || counts.loading} />
      </div>
    </div>
  );
}
