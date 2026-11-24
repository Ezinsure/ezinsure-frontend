'use client';

import { useState } from 'react';
import { FinanceApiError } from '../api/http';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import type { Payout } from '../domain';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { newIdempotencyKey } from '../ui/idempotency';

interface CancelPayoutDialogProps {
  payout: Payout | undefined;
  onClose: () => void;
  onCancelled: () => void;
}

export function CancelPayoutDialog({ payout, onClose, onCancelled }: CancelPayoutDialogProps) {
  const api = useFinanceLedgerApi();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const handleConfirm = async () => {
    if (!payout) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.cancelPayout(
        payout.id,
        { reason: reason.trim() },
        { idempotencyKey: newIdempotencyKey() },
      );
      setReason('');
      onCancelled();
    } catch (err) {
      setError(err instanceof FinanceApiError ? err.message : 'Could not cancel the payout.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={Boolean(payout)}
      title="Cancel payout"
      description={
        payout ? (
          <>
            {payout.payoutNumber} will be cancelled and its {payout.lineCount} lines will go back to{' '}
            <strong>Ready to pay</strong>.
          </>
        ) : null
      }
      confirmLabel="Cancel payout"
      tone="danger"
      busy={busy}
      confirmDisabled={!reason.trim()}
      error={error}
      onCancel={() => {
        if (!busy) {
          setError(undefined);
          setReason('');
          onClose();
        }
      }}
      onConfirm={handleConfirm}
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Reason <span className="text-rose-600">*</span>
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          disabled={busy}
          placeholder="Why is this payout being cancelled?"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
      </label>
    </ConfirmDialog>
  );
}
