'use client';

import { useEffect, useState } from 'react';
import { formatMoney } from '@/utils/money';
import { FinanceApiError } from '../api/http';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import {
  MISMATCH_KIND_LABELS,
  MISMATCH_REASON_CODES,
  MISMATCH_REASON_LABELS,
  MISMATCH_RESOLUTION_ACTIONS,
  hasErrors,
  validateResolveMismatch,
  type Mismatch,
  type MismatchReasonCode,
  type MismatchResolutionAction,
} from '../domain';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { FilterChip } from '../ui/filter-chip';
import { newIdempotencyKey } from '../ui/idempotency';
import { MoneyCell } from '../ui/money-cell';

const ACTION_LABELS: Record<MismatchResolutionAction, string> = {
  EXPLAIN: 'Explain',
  REBILL: 'Rebill later',
  WRITE_OFF: 'Write off',
};

const ACTION_HINTS: Record<MismatchResolutionAction, string> = {
  EXPLAIN: 'Record why the amounts differ. The paid amount stands.',
  REBILL: 'We will include this shortfall when we bill SONARWA again.',
  WRITE_OFF: 'Solektra absorbs this difference. A note is required.',
};

interface ResolveMismatchDialogProps {
  mismatch: Mismatch | undefined;
  onClose: () => void;
  onResolved: () => void;
}

export function ResolveMismatchDialog({ mismatch, onClose, onResolved }: ResolveMismatchDialogProps) {
  const api = useFinanceLedgerApi();
  const [action, setAction] = useState<MismatchResolutionAction>('EXPLAIN');
  const [reasonCode, setReasonCode] = useState<MismatchReasonCode | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!mismatch) return;
    setAction('EXPLAIN');
    setReasonCode('');
    setNote('');
    setError(undefined);
    setFieldErrors({});
  }, [mismatch]);

  const handleConfirm = async () => {
    if (!mismatch || !reasonCode) {
      setFieldErrors({ reasonCode: 'Choose a reason.' });
      return;
    }
    const input = { action, reasonCode, note: note.trim() || undefined };
    const errors = validateResolveMismatch(input);
    if (hasErrors(errors)) {
      setFieldErrors(errors);
      setError(Object.values(errors)[0]);
      return;
    }
    setBusy(true);
    setError(undefined);
    setFieldErrors({});
    try {
      await api.resolveMismatch(mismatch.id, input, { idempotencyKey: newIdempotencyKey() });
      onResolved();
    } catch (err) {
      const apiErr = err instanceof FinanceApiError ? err : undefined;
      setError(apiErr?.message ?? 'Could not resolve the difference.');
      if (apiErr?.fieldErrors) setFieldErrors(apiErr.fieldErrors);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={Boolean(mismatch)}
      title="Resolve difference"
      description={
        mismatch ? (
          <>
            {MISMATCH_KIND_LABELS[mismatch.kind]} on{' '}
            <span className="font-mono font-medium">{mismatch.contractNumber}</span> (
            {mismatch.statementNumber}).
          </>
        ) : null
      }
      confirmLabel="Save resolution"
      tone={action === 'WRITE_OFF' ? 'danger' : 'primary'}
      busy={busy}
      confirmDisabled={!reasonCode}
      error={error}
      onCancel={() => {
        if (!busy) onClose();
      }}
      onConfirm={handleConfirm}
    >
      {mismatch ? (
        <>
          <dl className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">Expected</dt>
              <dd className="mt-0.5 font-semibold">{formatMoney(mismatch.expectedAmount)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">SONARWA</dt>
              <dd className="mt-0.5 font-semibold">{formatMoney(mismatch.sonarwaAmount)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">Difference</dt>
              <dd className="mt-0.5">
                <MoneyCell value={mismatch.differenceAmount} signed tinted className="font-semibold" />
              </dd>
            </div>
          </dl>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Action</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Resolution action">
              {MISMATCH_RESOLUTION_ACTIONS.map((a) => (
                <FilterChip
                  key={a}
                  size="sm"
                  label={ACTION_LABELS[a]}
                  pressed={action === a}
                  onClick={() => setAction(a)}
                  title={ACTION_HINTS[a]}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{ACTION_HINTS[action]}</p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Reason <span className="text-rose-600">*</span>
            </span>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value as MismatchReasonCode | '')}
              disabled={busy}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Choose a reason</option>
              {MISMATCH_REASON_CODES.map((code) => (
                <option key={code} value={code}>
                  {MISMATCH_REASON_LABELS[code]}
                </option>
              ))}
            </select>
            {fieldErrors.reasonCode ? (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors.reasonCode}</p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Note
              {action === 'WRITE_OFF' || reasonCode === 'OTHER' ? (
                <span className="text-rose-600"> *</span>
              ) : (
                ' (optional)'
              )}
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              disabled={busy}
              placeholder="What did SONARWA say, or why are we absorbing this?"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {fieldErrors.note ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.note}</p> : null}
          </label>
        </>
      ) : null}
    </ConfirmDialog>
  );
}
