'use client';

import { useCallback, useEffect, useState } from 'react';
import { todayDateInputValue } from '@/utils/date-formatter';
import { formatMoney } from '@/utils/money';
import { FinanceApiError } from '../api/http';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import { hasErrors, validateMarkPayoutPaid, type Payout, type PayoutVetRow } from '../domain';
import { useAsyncResource } from '../hooks/use-async-resource';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { newIdempotencyKey } from '../ui/idempotency';
import { Skeleton } from '../ui/skeleton';

interface MarkPaidDialogProps {
  payout: Payout | undefined;
  onClose: () => void;
  onPaid: () => void;
}

export function MarkPaidDialog({ payout, onClose, onPaid }: MarkPaidDialogProps) {
  const api = useFinanceLedgerApi();
  const payoutId = payout?.id;
  const fetcher = useCallback(
    (signal: AbortSignal) => {
      if (!payoutId) return Promise.resolve({ data: [] as PayoutVetRow[], meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 } });
      return api.listPayoutVets(payoutId, { pageSize: 100 }, { signal });
    },
    [api, payoutId],
  );
  const { data, loading, error: loadError, reload } = useAsyncResource(fetcher, { enabled: Boolean(payoutId) });

  const [paidAt, setPaidAt] = useState(todayDateInputValue());
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!payout) return;
    setPaidAt(todayDateInputValue());
    setRefs({});
    setError(undefined);
    setFieldErrors({});
  }, [payout]);

  const vets = data?.data ?? [];

  const handleConfirm = async () => {
    if (!payout) return;
    const input = {
      paidAt,
      vets: vets.map((v) => ({ vetId: v.id, paymentReference: refs[v.id] ?? '' })),
    };
    const errors = validateMarkPayoutPaid(input, vets.map((v) => v.id));
    if (hasErrors(errors)) {
      setFieldErrors(errors);
      setError('Enter a payment reference for every vet.');
      return;
    }
    setBusy(true);
    setError(undefined);
    setFieldErrors({});
    try {
      await api.markPayoutPaid(payout.id, input, { idempotencyKey: newIdempotencyKey() });
      onPaid();
    } catch (err) {
      const apiErr = err instanceof FinanceApiError ? err : undefined;
      setError(apiErr?.message ?? 'Could not mark the payout as paid.');
      if (apiErr?.fieldErrors) setFieldErrors(apiErr.fieldErrors);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={Boolean(payout)}
      title="Mark payout as paid"
      description={
        payout ? (
          <>
            Record the bank / mobile-money reference for each vet in{' '}
            <span className="font-mono font-medium">{payout.payoutNumber}</span>. Lines will move to{' '}
            <strong>Paid to vet</strong> and join this month&apos;s open statement.
          </>
        ) : null
      }
      confirmLabel="Confirm paid"
      busy={busy}
      confirmDisabled={loading || vets.length === 0}
      error={error ?? loadError}
      onCancel={() => {
        if (!busy) onClose();
      }}
      onConfirm={handleConfirm}
    >
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : loadError ? (
        <button type="button" onClick={reload} className="text-sm text-[var(--portal-primary)] hover:underline">
          Try loading vets again
        </button>
      ) : (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Paid on <span className="text-rose-600">*</span>
            </span>
            <input
              type="date"
              value={paidAt}
              max={todayDateInputValue()}
              onChange={(e) => setPaidAt(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {fieldErrors.paidAt ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.paidAt}</p> : null}
          </label>

          <ul className="max-h-64 space-y-3 overflow-y-auto">
            {vets.map((vet) => (
              <li key={vet.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <p className="font-medium text-slate-900">{vet.name}</p>
                  <p className="tabular-nums text-slate-700">{formatMoney(vet.amount)}</p>
                </div>
                <p className="text-xs text-slate-500">
                  {vet.lineCount} line{vet.lineCount === 1 ? '' : 's'}
                  {vet.bankAccountNumber ? ` · ${vet.bankName ?? 'Account'} ${vet.bankAccountNumber}` : ''}
                </p>
                <label className="mt-2 block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Payment reference <span className="text-rose-600">*</span>
                  </span>
                  <input
                    type="text"
                    value={refs[vet.id] ?? ''}
                    onChange={(e) => setRefs((prev) => ({ ...prev, [vet.id]: e.target.value }))}
                    disabled={busy}
                    placeholder="Bank / MoMo transaction ID"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
                  />
                  {fieldErrors[`vets.${vet.id}`] ? (
                    <p className="mt-1 text-xs text-rose-600">{fieldErrors[`vets.${vet.id}`]}</p>
                  ) : null}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </ConfirmDialog>
  );
}
