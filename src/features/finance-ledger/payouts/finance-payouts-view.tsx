'use client';

import { Suspense, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { DEFAULT_PAGE_SIZE, type Payout } from '../domain';
import { useTableSelection } from '../hooks/use-table-selection';
import { useUrlState } from '../hooks/use-url-state';
import { resolvePeriodPreset } from '../period/presets';
import { FilterChip } from '../ui/filter-chip';
import { PageHeader } from '../ui/page-header';
import { CancelPayoutDialog } from './cancel-payout-dialog';
import { MarkPaidDialog } from './mark-paid-dialog';
import { PayablesPanel } from './payables-panel';
import { PayoutDetailDrawer } from './payout-detail-drawer';
import { PayoutsPanel } from './payouts-panel';
import { PreparePayoutDialog } from './prepare-payout-dialog';
import { usePayables } from './use-payables';
import { usePayoutsList } from './use-payouts-list';

const defaults = (() => {
  const span = resolvePeriodPreset('sixMonths');
  return {
    tab: 'ready',
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sort: '-amount',
    search: '',
    from: span.from,
    to: span.to,
    status: '',
    payout: '',
  };
})();

function PayoutsBody() {
  const { values, setValues } = useUrlState(defaults);
  const selection = useTableSelection();
  const { showToast, ToastContainer } = useToast();

  const [prepareOpen, setPrepareOpen] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<Payout>();
  const [cancelTarget, setCancelTarget] = useState<Payout>();

  const span = useMemo(() => ({ from: values.from, to: values.to }), [values.from, values.to]);
  const isReady = values.tab === 'ready';

  const payables = usePayables({
    from: values.from,
    to: values.to,
    search: values.search,
    page: values.page,
    pageSize: values.pageSize,
    sort: isReady ? values.sort : '-amount',
  });

  const payouts = usePayoutsList({
    from: values.from,
    to: values.to,
    search: values.search,
    status: values.status,
    page: values.page,
    pageSize: values.pageSize,
    sort: isReady ? '-preparedAt' : values.sort,
  });

  const selectedOnPageAmount =
    payables.data?.data
      .filter((row) => selection.isSelected(row.id))
      .reduce((sum, row) => sum + row.amount, 0) ?? 0;

  const findPayout = (id: string) => payouts.data?.data.find((p) => p.id === id);

  const switchTab = (tab: string) => {
    selection.clear();
    setValues({
      tab,
      page: 1,
      sort: tab === 'ready' ? '-amount' : '-preparedAt',
      status: '',
      search: '',
      payout: '',
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <ToastContainer />
      <PageHeader
        title="Payouts"
        description="Pay approved vets, then record the bank transfer. Prepared payouts are not money sent yet."
      />

      <div className="inline-flex gap-1 rounded-lg border border-slate-200 bg-white p-1" role="tablist">
        <FilterChip label="Ready to pay" pressed={isReady} onClick={() => switchTab('ready')} />
        <FilterChip label="Payout history" pressed={!isReady} onClick={() => switchTab('history')} />
      </div>

      {isReady ? (
        <PayablesPanel
          span={span}
          search={values.search}
          sort={values.sort}
          rows={payables.data?.data}
          meta={payables.data?.meta}
          loading={payables.loading}
          fetching={payables.fetching}
          error={payables.error}
          selection={selection}
          onRetry={payables.reload}
          onSpanChange={(next) => setValues(next)}
          onSearch={(search) => setValues({ search })}
          onSortChange={(sort) => setValues({ sort })}
          onPageChange={(page) => setValues({ page })}
          onPageSizeChange={(pageSize) => setValues({ pageSize })}
          onPrepare={() => setPrepareOpen(true)}
        />
      ) : (
        <PayoutsPanel
          span={span}
          search={values.search}
          status={values.status}
          sort={values.sort}
          rows={payouts.data?.data}
          meta={payouts.data?.meta}
          loading={payouts.loading}
          fetching={payouts.fetching}
          error={payouts.error}
          activePayoutId={values.payout || undefined}
          onRetry={payouts.reload}
          onSpanChange={(next) => setValues(next)}
          onSearch={(search) => setValues({ search })}
          onStatusChange={(status) => setValues({ status })}
          onSortChange={(sort) => setValues({ sort })}
          onPageChange={(page) => setValues({ page })}
          onPageSizeChange={(pageSize) => setValues({ pageSize })}
          onOpen={(payout) => setValues({ payout: payout.id })}
          onMarkPaid={setMarkPaidTarget}
          onCancel={setCancelTarget}
        />
      )}

      <PreparePayoutDialog
        open={prepareOpen}
        vetIds={[...selection.selectedIds]}
        period={span}
        selectedOnPageAmount={selectedOnPageAmount}
        onCancel={() => setPrepareOpen(false)}
        onPrepared={(payoutId) => {
          setPrepareOpen(false);
          selection.clear();
          showToast('Payout prepared. Mark it paid once the transfer is done.', 'success');
          setValues({
            tab: 'history',
            page: 1,
            sort: '-preparedAt',
            status: 'PREPARED',
            search: '',
            payout: payoutId,
          });
          payouts.reload();
          payables.reload();
        }}
      />

      <MarkPaidDialog
        payout={markPaidTarget}
        onClose={() => setMarkPaidTarget(undefined)}
        onPaid={() => {
          setMarkPaidTarget(undefined);
          setValues({ payout: '' });
          showToast('Payout marked as paid.', 'success');
          payouts.reload();
          payables.reload();
        }}
      />

      <CancelPayoutDialog
        payout={cancelTarget}
        onClose={() => setCancelTarget(undefined)}
        onCancelled={() => {
          setCancelTarget(undefined);
          setValues({ payout: '' });
          showToast('Payout cancelled. Lines are ready to pay again.', 'info');
          payouts.reload();
          payables.reload();
        }}
      />

      <PayoutDetailDrawer
        payoutId={values.payout || undefined}
        onClose={() => setValues({ payout: '' })}
        onMarkPaid={() => {
          const payout = findPayout(values.payout);
          if (payout) setMarkPaidTarget(payout);
        }}
        onCancel={() => {
          const payout = findPayout(values.payout);
          if (payout) setCancelTarget(payout);
        }}
      />
    </div>
  );
}

export function FinancePayoutsView() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading payouts…</div>}>
      <PayoutsBody />
    </Suspense>
  );
}
