'use client';

import { useState } from 'react';
import { formatMoney } from '@/utils/money';
import { FinanceApiError } from '../api/http';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import type { DateSpan } from '../period/presets';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { newIdempotencyKey } from '../ui/idempotency';

interface PreparePayoutDialogProps {
  open: boolean;
  vetIds: readonly string[];
  period: DateSpan;
  /** Approximate total from the current page selection (may undercount across pages). */
  selectedOnPageAmount: number;
  onCancel: () => void;
  onPrepared: (payoutId: string) => void;
}

export function PreparePayoutDialog({
  open,
  vetIds,
  period,
  selectedOnPageAmount,
  onCancel,
  onPrepared,
}: PreparePayoutDialogProps) {
  const api = useFinanceLedgerApi();
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const handleConfirm = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const payout = await api.createPayout(
        {
          module: 'livestock',
          selection: { mode: 'vets', vetIds: [...vetIds], period: { ...period, by: 'approvedAt' } },
          notes: notes.trim() || undefined,
        },
        { idempotencyKey: newIdempotencyKey() },
      );
      setNotes('');
      onPrepared(payout.id);
    } catch (err) {
      setError(err instanceof FinanceApiError ? err.message : 'Could not prepare the payout.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      title="Prepare payout"
      description={
        <>
          This groups the selected vets&apos; ready lines into one payout. The money is not sent yet —
          you will mark it paid after the bank transfer.
        </>
      }
      confirmLabel={`Prepare for ${vetIds.length} vet${vetIds.length === 1 ? '' : 's'}`}
      busy={busy}
      confirmDisabled={vetIds.length === 0}
      error={error}
      onCancel={() => {
        if (!busy) {
          setError(undefined);
          onCancel();
        }
      }}
      onConfirm={handleConfirm}
    >
      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">Vets</dt>
          <dd className="mt-0.5 font-semibold text-slate-900">{vetIds.length}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-slate-500">On this page</dt>
          <dd className="mt-0.5 font-semibold text-slate-900">{formatMoney(selectedOnPageAmount)}</dd>
        </div>
      </dl>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Notes (optional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          disabled={busy}
          placeholder="e.g. November fortnight batch"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
      </label>
    </ConfirmDialog>
  );
}
