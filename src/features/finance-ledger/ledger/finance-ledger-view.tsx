'use client';

import { Suspense, useMemo } from 'react';
import { DEFAULT_PAGE_SIZE } from '../domain';
import { useUrlState } from '../hooks/use-url-state';
import { resolvePeriodPreset } from '../period/presets';
import { PageHeader } from '../ui/page-header';
import { Pagination } from '../ui/pagination';
import { LedgerFilters } from './ledger-filters';
import { LedgerTable } from './ledger-table';
import { LineDetailDrawer } from './line-detail-drawer';
import { useLedgerLines } from './use-ledger-lines';

const defaults = (() => {
  const span = resolvePeriodPreset('sixMonths');
  return {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sort: '-submittedAt',
    search: '',
    from: span.from,
    to: span.to,
    stage: [] as string[],
    source: '',
    mismatch: '',
    /** Open line id — keeps the drawer shareable and refresh-safe. */
    line: '',
  };
})();

function LedgerBody() {
  const { values, setValues, reset } = useUrlState(defaults);
  const query = useMemo(
    () => ({
      page: values.page,
      pageSize: values.pageSize,
      sort: values.sort,
      search: values.search,
      from: values.from,
      to: values.to,
      stage: values.stage,
      source: values.source,
      mismatch: values.mismatch,
    }),
    [values],
  );
  const { data, loading, fetching, error, reload } = useLedgerLines(query);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Ledger"
        description="Every commission line from submission to reimbursement. Click a row to see its full timeline."
      />

      <LedgerFilters
        values={{
          from: values.from,
          to: values.to,
          search: values.search,
          stage: values.stage,
          source: values.source,
          mismatch: values.mismatch,
        }}
        onChange={(patch) => setValues(patch)}
        onReset={() =>
          setValues({
            search: '',
            stage: [],
            source: '',
            mismatch: '',
            from: defaults.from,
            to: defaults.to,
          })
        }
      />

      <LedgerTable
        rows={data?.data}
        loading={loading}
        fetching={fetching}
        error={error}
        onRetry={reload}
        sort={values.sort}
        onSortChange={(sort) => setValues({ sort })}
        activeLineId={values.line || undefined}
        onRowClick={(line) => setValues({ line: line.id })}
      />

      <Pagination
        meta={data?.meta}
        disabled={fetching}
        onPageChange={(page) => setValues({ page })}
        onPageSizeChange={(pageSize) => setValues({ pageSize })}
      />

      <LineDetailDrawer
        lineId={values.line || undefined}
        onClose={() => setValues({ line: '' })}
      />
    </div>
  );
}

/** Unified livestock ledger. Filters and the open line live in the URL. */
export function FinanceLedgerView() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading ledger…</div>}>
      <LedgerBody />
    </Suspense>
  );
}
