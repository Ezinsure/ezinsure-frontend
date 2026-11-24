'use client';

import { Suspense, useMemo } from 'react';
import { toDateOnly } from '../domain';
import { useUrlState } from '../hooks/use-url-state';
import { resolvePeriodPreset } from '../period/presets';
import { ErrorState } from '../ui/state-panels';
import { PageHeader } from '../ui/page-header';
import { PeriodPicker } from '../ui/period-picker';
import { buildAttentionItems } from './attention';
import { AttentionPanel } from './attention-panel';
import { OverviewStats } from './overview-stats';
import { PeriodTable } from './period-table';
import { useOverviewData } from './use-overview-data';

const MODULE = 'livestock' as const;
const OVERVIEW_PRESETS = ['sixMonths', 'quarter', 'thisYear', 'thisMonth', 'lastMonth'] as const;

const defaults = (() => {
  const span = resolvePeriodPreset('sixMonths');
  return { from: span.from, to: span.to };
})();

function OverviewBody() {
  const { values, setValues } = useUrlState(defaults);
  const span = useMemo(() => ({ from: values.from, to: values.to }), [values.from, values.to]);
  const { summary, counts, reload } = useOverviewData(MODULE, span);

  const attention = useMemo(() => {
    if (!summary.data) return undefined;
    return buildAttentionItems({
      summary: summary.data,
      readyLineCount: counts.data?.readyLineCount ?? 0,
      preparedPayoutCount: counts.data?.preparedPayoutCount ?? 0,
      today: toDateOnly(new Date()),
    });
  }, [summary.data, counts.data]);

  const attentionLoading = summary.loading || counts.loading;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Finance overview"
        description="Track what we paid to vets, what we billed SONARWA, and what came back — month by month."
      />

      <PeriodPicker
        value={span}
        onChange={(next) => setValues(next)}
        presets={OVERVIEW_PRESETS}
        label="Show months from"
      />

      {summary.error && !summary.data ? (
        <ErrorState message={summary.error} onRetry={reload} />
      ) : (
        <>
          <OverviewStats summary={summary.data} loading={summary.loading} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <PeriodTable
              rows={summary.data?.rows.filter(
                (row) => row.paidLineCount > 0 || row.statementId !== undefined,
              )}
              loading={summary.loading}
              fetching={summary.fetching}
              error={summary.error}
              onRetry={reload}
            />
            <AttentionPanel items={attention} loading={attentionLoading} />
          </div>
        </>
      )}
    </div>
  );
}

/** Livestock Finance Home. Filters live in the URL so the view can be shared. */
export function FinanceOverviewView() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading overview…</div>}>
      <OverviewBody />
    </Suspense>
  );
}
