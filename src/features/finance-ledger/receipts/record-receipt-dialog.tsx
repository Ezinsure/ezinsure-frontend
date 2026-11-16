'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { todayDateInputValue } from '@/utils/date-formatter';
import { formatMoney } from '@/utils/money';
import { FinanceApiError } from '../api/http';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import {
  applyReceiptTotalToLines,
  hasErrors,
  sumAmounts,
  validateCreateReceipt,
  type Statement,
} from '../domain';
import { useAsyncResource } from '../hooks/use-async-resource';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { newIdempotencyKey } from '../ui/idempotency';
import { Skeleton } from '../ui/skeleton';
import { formatLocalDate } from '../ui/format-local-date';

interface RecordReceiptDialogProps {
  open: boolean;
  /** Pre-select a statement when opened from the statements page. */
  initialStatementId?: string;
  onClose: () => void;
  onRecorded: (receiptId: string) => void;
}

function suggestAllocations(
  statements: Statement[],
  selectedIds: string[],
  amount: number,
): Record<string, string> {
  const selected = statements
    .filter((s) => selectedIds.includes(s.id) && s.outstandingAmount > 0)
    .sort((a, b) => a.periodFrom.localeCompare(b.periodFrom));
  let remaining = amount;
  const next: Record<string, string> = {};
  for (const s of selected) {
    if (remaining <= 0) {
      next[s.id] = '';
      continue;
    }
    const take = Math.min(s.outstandingAmount, remaining);
    next[s.id] = String(take);
    remaining -= take;
  }
  return next;
}

export function RecordReceiptDialog({
  open,
  initialStatementId,
  onClose,
  onRecorded,
}: RecordReceiptDialogProps) {
  const api = useFinanceLedgerApi();
  const statementsFetcher = useCallback(
    (signal: AbortSignal) =>
      api.listStatements(
        {
          module: 'livestock',
          status: ['ISSUED', 'PARTIALLY_RECONCILED'],
          pageSize: 100,
          sort: 'periodFrom',
        },
        { signal },
      ),
    [api],
  );
  const statementsRes = useAsyncResource(statementsFetcher, { enabled: open });
  const statements = statementsRes.data?.data ?? [];

  const [amount, setAmount] = useState('');
  const [receivedAt, setReceivedAt] = useState(todayDateInputValue());
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allocText, setAllocText] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setReceivedAt(todayDateInputValue());
    setReference('');
    setNote('');
    setError(undefined);
    setFieldErrors({});
    const initial = initialStatementId
      ? [initialStatementId]
      : statements.filter((s) => s.outstandingAmount > 0).slice(0, 1).map((s) => s.id);
    setSelectedIds(initial);
    setAllocText({});
  }, [open, initialStatementId]);

  // Once statements load, default selection and fill allocation from outstanding.
  useEffect(() => {
    if (!open || !statements.length) return;
    setSelectedIds((prev) => {
      if (prev.length) return prev.filter((id) => statements.some((s) => s.id === id));
      if (initialStatementId && statements.some((s) => s.id === initialStatementId)) {
        return [initialStatementId];
      }
      // Prefer a fully outstanding issued month over a short-paid one that only has disputes left.
      const first =
        statements.find((s) => s.status === 'ISSUED' && s.outstandingAmount > 0) ??
        statements.find((s) => s.outstandingAmount > 0);
      return first ? [first.id] : [];
    });
  }, [open, statements, initialStatementId]);

  const amountNumber = Number(amount);
  const selected = statements.filter((s) => selectedIds.includes(s.id));

  useEffect(() => {
    if (!open || !selectedIds.length || !Number.isFinite(amountNumber) || amountNumber <= 0) return;
    setAllocText(suggestAllocations(statements, selectedIds, amountNumber));
  }, [amountNumber, selectedIds.join(','), open]); // eslint-disable-line react-hooks/exhaustive-deps

  const allocations = selected
    .map((s) => ({ statementId: s.id, amount: Number(allocText[s.id]) }))
    .filter((a) => Number.isFinite(a.amount) && a.amount > 0);

  const allocSum = sumAmounts(allocations.map((a) => a.amount));

  const allocationKey = allocations.map((a) => `${a.statementId}:${a.amount}`).join('|');
  const previewFetcher = useCallback(
    async (signal: AbortSignal) => {
      if (!allocations.length) return null;
      const previews = await Promise.all(
        allocations.map(async (a) => {
          const lines = await api.listLines(
            {
              module: 'livestock',
              statementId: a.statementId,
              stage: 'BILLED',
              pageSize: 100,
              sort: 'paidAt',
            },
            { signal },
          );
          const billed = lines.data.map((l) => ({
            lineId: l.id,
            expectedAmount: l.expectedAmount,
            paidAt: l.paidAt ?? l.submittedAt,
            contractNumber: l.contractNumber,
            vetName: l.vet.name,
            statementId: a.statementId,
          }));
          return applyReceiptTotalToLines(billed, a.amount);
        }),
      );
      return {
        fullyCoveredCount: sumAmounts(previews.map((p) => p.fullyCoveredCount)),
        partiallyCoveredCount: sumAmounts(previews.map((p) => p.partiallyCoveredCount)),
        remainingLineCount: sumAmounts(previews.map((p) => p.remainingLineCount)),
      };
    },
    // allocationKey captures statement/amount pairs; allocations is read from the closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api, allocationKey],
  );
  const preview = useAsyncResource(previewFetcher, {
    enabled: open && allocations.length > 0 && allocSum === amountNumber && amountNumber > 0,
  });

  const toggleStatement = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const fillFromOutstanding = () => {
    const total = sumAmounts(selected.map((s) => Math.max(0, s.outstandingAmount)));
    setAmount(String(total));
    setAllocText(
      Object.fromEntries(selected.map((s) => [s.id, String(Math.max(0, s.outstandingAmount))])),
    );
  };

  const handleConfirm = async () => {
    const input = {
      module: 'livestock' as const,
      amount: amountNumber,
      receivedAt,
      reference,
      allocations,
      note: note.trim() || undefined,
    };
    const errors = validateCreateReceipt(input);
    if (hasErrors(errors)) {
      setFieldErrors(errors);
      setError(errors.allocations ?? errors.amount ?? errors.reference ?? errors.receivedAt);
      return;
    }
    setBusy(true);
    setError(undefined);
    setFieldErrors({});
    try {
      const receipt = await api.createReceipt(input, { idempotencyKey: newIdempotencyKey() });
      onRecorded(receipt.id);
    } catch (err) {
      const apiErr = err instanceof FinanceApiError ? err : undefined;
      setError(apiErr?.message ?? 'Could not record the receipt.');
      if (apiErr?.fieldErrors) setFieldErrors(apiErr.fieldErrors);
    } finally {
      setBusy(false);
    }
  };

  const outstandingHint = useMemo(
    () => sumAmounts(selected.map((s) => Math.max(0, s.outstandingAmount))),
    [selected],
  );

  return (
    <ConfirmDialog
      open={open}
      title="Record SONARWA payment"
      description="Enter the bank total SONARWA paid. We allocate it to statements and mark billed lines reimbursed, oldest first."
      confirmLabel="Record receipt"
      busy={busy}
      confirmDisabled={statementsRes.loading || selectedIds.length === 0}
      error={error ?? statementsRes.error}
      onCancel={() => {
        if (!busy) onClose();
      }}
      onConfirm={handleConfirm}
    >
      {statementsRes.loading ? (
        <Skeleton className="h-32 w-full" />
      ) : statements.length === 0 ? (
        <p className="text-sm text-slate-600">
          There are no issued statements waiting for payment. Issue a statement first.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Amount received <span className="text-rose-600">*</span>
              </span>
              <input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={busy}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
              {fieldErrors.amount ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.amount}</p> : null}
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Received on <span className="text-rose-600">*</span>
              </span>
              <input
                type="date"
                value={receivedAt}
                max={todayDateInputValue()}
                onChange={(e) => setReceivedAt(e.target.value)}
                disabled={busy}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                SONARWA payment reference <span className="text-rose-600">*</span>
              </span>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={busy}
                placeholder="Bank remittance / transfer ID"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
              />
              {fieldErrors.reference ? (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.reference}</p>
              ) : null}
            </label>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Allocate to statements
              </p>
              <button
                type="button"
                onClick={fillFromOutstanding}
                disabled={busy || selectedIds.length === 0}
                className="cursor-pointer text-xs font-medium text-[var(--portal-primary)] hover:underline disabled:opacity-40"
              >
                Fill from outstanding ({formatMoney(outstandingHint)})
              </button>
            </div>
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {statements.map((s) => {
                const checked = selectedIds.includes(s.id);
                return (
                  <li
                    key={s.id}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        disabled={busy || s.outstandingAmount <= 0}
                        onChange={() => toggleStatement(s.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-mono font-medium text-slate-900">{s.statementNumber}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {formatLocalDate(s.periodFrom)} – {formatLocalDate(s.periodTo)} · owed{' '}
                          {formatMoney(s.outstandingAmount)}
                        </span>
                      </span>
                    </label>
                    {checked ? (
                      <label className="mt-2 block pl-6">
                        <span className="mb-1 block text-xs text-slate-500">Allocation</span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={allocText[s.id] ?? ''}
                          onChange={(e) =>
                            setAllocText((prev) => ({ ...prev, [s.id]: e.target.value }))
                          }
                          disabled={busy}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm tabular-nums"
                        />
                      </label>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {fieldErrors.allocations ? (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.allocations}</p>
            ) : amountNumber > 0 && allocations.length > 0 && allocSum !== amountNumber ? (
              <p className="mt-1 text-xs text-rose-600">
                Allocations total {formatMoney(allocSum)}; must equal {formatMoney(amountNumber)}.
              </p>
            ) : null}
          </div>

          {preview.data ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
              {preview.data.fullyCoveredCount + preview.data.partiallyCoveredCount === 0
                ? 'No billed lines are left on these statements. The payment still reduces what is owed; resolve open differences on the Mismatches page.'
                : `About ${preview.data.fullyCoveredCount} line${preview.data.fullyCoveredCount === 1 ? '' : 's'} will be marked reimbursed${
                    preview.data.partiallyCoveredCount
                      ? `; ${preview.data.partiallyCoveredCount} will be partly paid (a difference to review)`
                      : ''
                  }${
                    preview.data.remainingLineCount
                      ? `; ${preview.data.remainingLineCount} stay billed until a later payment`
                      : ''
                  }.`}
            </p>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Note (optional)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              disabled={busy}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </>
      )}
    </ConfirmDialog>
  );
}
