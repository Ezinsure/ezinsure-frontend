'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import {
  DEFAULT_PAGE_SIZE,
  MISMATCH_KIND_LABELS,
  MISMATCH_KINDS,
  MISMATCH_STATUS_LABELS,
  MISMATCH_STATUSES,
  type Mismatch,
  type MismatchKind,
  type MismatchStatus,
} from '../domain';
import { useUrlState } from '../hooks/use-url-state';
import { resolvePeriodPreset } from '../period/presets';
import { FilterChip } from '../ui/filter-chip';
import { PageHeader } from '../ui/page-header';
import { Pagination } from '../ui/pagination';
import { PeriodPicker } from '../ui/period-picker';
import { SearchBox } from '../ui/search-box';
import { MismatchDetailDrawer } from './mismatch-detail-drawer';
import { MismatchesTable } from './mismatches-table';
import { ResolveMismatchDialog } from './resolve-mismatch-dialog';
import { useMismatchesList } from './use-mismatches-list';

const PRESETS = ['sixMonths', 'quarter', 'thisYear', 'thisMonth', 'lastMonth'] as const;

const defaults = (() => {
  const span = resolvePeriodPreset('sixMonths');
  return {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sort: '-createdAt',
    search: '',
    from: span.from,
    to: span.to,
    status: 'OPEN',
    kind: '',
    mismatch: '',
  };
})();

function MismatchesBody() {
  const { values, setValues } = useUrlState(defaults);
  const { showToast, ToastContainer } = useToast();
  const [selected, setSelected] = useState<Mismatch>();
  const [resolveTarget, setResolveTarget] = useState<Mismatch>();

  const span = useMemo(() => ({ from: values.from, to: values.to }), [values.from, values.to]);
  const list = useMismatchesList({
    from: values.from,
    to: values.to,
    search: values.search,
    status: values.status,
    kind: values.kind,
    statementId: '',
    page: values.page,
    pageSize: values.pageSize,
    sort: values.sort,
  });

  useEffect(() => {
    if (!values.mismatch || !list.data) return;
    const found = list.data.data.find((m) => m.id === values.mismatch);
    if (found) setSelected(found);
  }, [values.mismatch, list.data]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <ToastContainer />
      <PageHeader
        title="Differences"
        description="When SONARWA's total underpays a line, or a billed line was never covered, record why — explain, rebill, or write off."
      />

      <div className="flex flex-wrap items-start gap-3">
        <PeriodPicker
          value={span}
          onChange={(next) => setValues(next)}
          presets={PRESETS}
          label="Opened in"
        />
        <SearchBox
          value={values.search}
          onSearch={(search) => setValues({ search })}
          placeholder="Search contract or vet"
          className="min-w-[14rem] flex-1"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Status">
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-500">Status</span>
          <FilterChip
            size="sm"
            label="All"
            pressed={values.status === ''}
            onClick={() => setValues({ status: '' })}
          />
          {MISMATCH_STATUSES.map((status) => (
            <FilterChip
              key={status}
              size="sm"
              label={MISMATCH_STATUS_LABELS[status as MismatchStatus]}
              pressed={values.status === status}
              onClick={() => setValues({ status })}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Kind">
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-500">Kind</span>
          <FilterChip
            size="sm"
            label="All"
            pressed={values.kind === ''}
            onClick={() => setValues({ kind: '' })}
          />
          {MISMATCH_KINDS.map((kind) => (
            <FilterChip
              key={kind}
              size="sm"
              label={MISMATCH_KIND_LABELS[kind as MismatchKind]}
              pressed={values.kind === kind}
              onClick={() => setValues({ kind })}
            />
          ))}
        </div>
      </div>

      <MismatchesTable
        rows={list.data?.data}
        loading={list.loading}
        fetching={list.fetching}
        error={list.error}
        sort={values.sort}
        activeId={values.mismatch || undefined}
        onRetry={list.reload}
        onSortChange={(sort) => setValues({ sort })}
        onOpen={(mismatch) => {
          setSelected(mismatch);
          setValues({ mismatch: mismatch.id });
        }}
      />

      <Pagination
        meta={list.data?.meta}
        disabled={list.fetching}
        onPageChange={(page) => setValues({ page })}
        onPageSizeChange={(pageSize) => setValues({ pageSize })}
      />

      <MismatchDetailDrawer
        mismatch={selected?.id === values.mismatch ? selected : undefined}
        onClose={() => {
          setSelected(undefined);
          setValues({ mismatch: '' });
        }}
        onResolve={() => {
          if (selected) setResolveTarget(selected);
        }}
      />

      <ResolveMismatchDialog
        mismatch={resolveTarget}
        onClose={() => setResolveTarget(undefined)}
        onResolved={() => {
          setResolveTarget(undefined);
          setSelected(undefined);
          setValues({ mismatch: '' });
          showToast('Difference resolved.', 'success');
          list.reload();
        }}
      />
    </div>
  );
}

export function FinanceMismatchesView() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading differences…</div>}>
      <MismatchesBody />
    </Suspense>
  );
}
