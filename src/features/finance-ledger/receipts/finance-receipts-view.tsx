'use client';

import { Suspense, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { DEFAULT_PAGE_SIZE } from '../domain';
import { useUrlState } from '../hooks/use-url-state';
import { resolvePeriodPreset } from '../period/presets';
import { PageHeader } from '../ui/page-header';
import { Pagination } from '../ui/pagination';
import { PeriodPicker } from '../ui/period-picker';
import { SearchBox } from '../ui/search-box';
import { ReceiptDetailDrawer } from './receipt-detail-drawer';
import { ReceiptsTable } from './receipts-table';
import { RecordReceiptDialog } from './record-receipt-dialog';
import { useReceiptsList } from './use-receipts-list';

const PRESETS = ['sixMonths', 'quarter', 'thisYear', 'thisMonth', 'lastMonth'] as const;

const defaults = (() => {
  const span = resolvePeriodPreset('sixMonths');
  return {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sort: '-receivedAt',
    search: '',
    from: span.from,
    to: span.to,
    receipt: '',
  };
})();

function ReceiptsBody() {
  const { values, setValues } = useUrlState(defaults);
  const { showToast, ToastContainer } = useToast();
  const [recordOpen, setRecordOpen] = useState(false);

  const span = useMemo(() => ({ from: values.from, to: values.to }), [values.from, values.to]);
  const list = useReceiptsList({
    from: values.from,
    to: values.to,
    search: values.search,
    statementId: '',
    page: values.page,
    pageSize: values.pageSize,
    sort: values.sort,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <ToastContainer />
      <PageHeader
        title="Receipts"
        description="Record the total SONARWA paid into the bank, allocate it to statements, and we mark billed lines reimbursed oldest first."
        actions={
          <button
            type="button"
            onClick={() => setRecordOpen(true)}
            className="cursor-pointer rounded-lg bg-[var(--portal-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--portal-primary-hover)]"
          >
            Record payment
          </button>
        }
      />

      <div className="flex flex-wrap items-start gap-3">
        <PeriodPicker
          value={span}
          onChange={(next) => setValues(next)}
          presets={PRESETS}
          label="Received in"
        />
        <SearchBox
          value={values.search}
          onSearch={(search) => setValues({ search })}
          placeholder="Search receipt number or reference"
          className="min-w-[14rem] flex-1"
        />
      </div>

      <ReceiptsTable
        rows={list.data?.data}
        loading={list.loading}
        fetching={list.fetching}
        error={list.error}
        sort={values.sort}
        activeId={values.receipt || undefined}
        onRetry={list.reload}
        onSortChange={(sort) => setValues({ sort })}
        onOpen={(receipt) => setValues({ receipt: receipt.id })}
      />

      <Pagination
        meta={list.data?.meta}
        disabled={list.fetching}
        onPageChange={(page) => setValues({ page })}
        onPageSizeChange={(pageSize) => setValues({ pageSize })}
      />

      <ReceiptDetailDrawer
        receiptId={values.receipt || undefined}
        onClose={() => setValues({ receipt: '' })}
      />

      <RecordReceiptDialog
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onRecorded={(receiptId) => {
          setRecordOpen(false);
          showToast('SONARWA payment recorded.', 'success');
          setValues({ receipt: receiptId, page: 1, sort: '-receivedAt' });
          list.reload();
        }}
      />
    </div>
  );
}

export function FinanceReceiptsView() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading receipts…</div>}>
      <ReceiptsBody />
    </Suspense>
  );
}
