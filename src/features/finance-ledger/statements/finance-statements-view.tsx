'use client';

import { Suspense, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import {
  DEFAULT_PAGE_SIZE,
  STATEMENT_STATUS_LABELS,
  STATEMENT_STATUSES,
  type Statement,
  type StatementStatus,
} from '../domain';
import { useUrlState } from '../hooks/use-url-state';
import { resolvePeriodPreset } from '../period/presets';
import { FilterChip } from '../ui/filter-chip';
import { PageHeader } from '../ui/page-header';
import { Pagination } from '../ui/pagination';
import { PeriodPicker } from '../ui/period-picker';
import { IssueStatementDialog } from './issue-statement-dialog';
import { StatementDetailDrawer } from './statement-detail-drawer';
import { StatementsTable } from './statements-table';
import { useStatementsList } from './use-statements-list';
import { WriteOffStatementDialog } from './write-off-statement-dialog';

const PRESETS = ['sixMonths', 'quarter', 'thisYear', 'thisMonth', 'lastMonth'] as const;

const defaults = (() => {
  const span = resolvePeriodPreset('sixMonths');
  return {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sort: '-periodFrom',
    from: span.from,
    to: span.to,
    status: '',
    overdue: false,
    statement: '',
  };
})();

function StatementsBody() {
  const { values, setValues } = useUrlState(defaults);
  const { showToast, ToastContainer } = useToast();
  const [issueTarget, setIssueTarget] = useState<Statement>();
  const [writeOffTarget, setWriteOffTarget] = useState<Statement>();
  const [drawerKey, setDrawerKey] = useState(0);

  const span = useMemo(() => ({ from: values.from, to: values.to }), [values.from, values.to]);
  const list = useStatementsList({
    from: values.from,
    to: values.to,
    status: values.status,
    overdueOnly: values.overdue,
    page: values.page,
    pageSize: values.pageSize,
    sort: values.sort,
  });

  const findStatement = (id: string) => list.data?.data.find((s) => s.id === id);

  const refresh = () => {
    list.reload();
    setDrawerKey((n) => n + 1);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <ToastContainer />
      <PageHeader
        title="Statements"
        description="Bill SONARWA month by month for what we paid vets, then track what has come back."
      />

      <PeriodPicker
        value={span}
        onChange={(next) => setValues(next)}
        presets={PRESETS}
        label="Statement period"
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Status">
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-500">Status</span>
          <FilterChip
            size="sm"
            label="All"
            pressed={values.status === ''}
            onClick={() => setValues({ status: '' })}
          />
          {STATEMENT_STATUSES.map((status) => (
            <FilterChip
              key={status}
              size="sm"
              label={STATEMENT_STATUS_LABELS[status as StatementStatus]}
              pressed={values.status === status}
              onClick={() => setValues({ status })}
            />
          ))}
        </div>
        <FilterChip
          size="sm"
          label="Overdue only"
          pressed={values.overdue}
          onClick={() => setValues({ overdue: !values.overdue })}
          title="Statements still owed for 60 days or more"
        />
      </div>

      <StatementsTable
        rows={list.data?.data}
        loading={list.loading}
        fetching={list.fetching}
        error={list.error}
        sort={values.sort}
        activeId={values.statement || undefined}
        onRetry={list.reload}
        onSortChange={(sort) => setValues({ sort })}
        onOpen={(statement) => setValues({ statement: statement.id })}
      />

      <Pagination
        meta={list.data?.meta}
        disabled={list.fetching}
        onPageChange={(page) => setValues({ page })}
        onPageSizeChange={(pageSize) => setValues({ pageSize })}
      />

      <StatementDetailDrawer
        key={`${values.statement}-${drawerKey}`}
        statementId={values.statement || undefined}
        onClose={() => setValues({ statement: '' })}
        onIssue={() => {
          const statement = values.statement ? findStatement(values.statement) : undefined;
          if (statement) setIssueTarget(statement);
        }}
        onWriteOff={() => {
          const statement = values.statement ? findStatement(values.statement) : undefined;
          if (statement) setWriteOffTarget(statement);
        }}
      />

      <IssueStatementDialog
        statement={issueTarget}
        onClose={() => setIssueTarget(undefined)}
        onIssued={() => {
          setIssueTarget(undefined);
          showToast('Statement issued to SONARWA.', 'success');
          refresh();
        }}
      />

      <WriteOffStatementDialog
        statement={writeOffTarget}
        onClose={() => setWriteOffTarget(undefined)}
        onWrittenOff={() => {
          setWriteOffTarget(undefined);
          setValues({ statement: '' });
          showToast('Remaining balance written off.', 'info');
          list.reload();
        }}
      />
    </div>
  );
}

export function FinanceStatementsView() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading statements…</div>}>
      <StatementsBody />
    </Suspense>
  );
}
