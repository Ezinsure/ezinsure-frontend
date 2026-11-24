'use client';

import { useState } from 'react';
import { formatMoney } from '@/utils/money';
import { FinanceApiError } from '../api/http';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import type { Statement } from '../domain';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { newIdempotencyKey } from '../ui/idempotency';

interface WriteOffStatementDialogProps {
  statement: Statement | undefined;
  onClose: () => void;
  onWrittenOff: () => void;
}

export function WriteOffStatementDialog({
  statement,
  onClose,
  onWrittenOff,
}: WriteOffStatementDialogProps) {
  const api = useFinanceLedgerApi();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const handleConfirm = async () => {
    if (!statement) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.writeOffStatement(
        statement.id,
        { reason: reason.trim() },
        { idempotencyKey: newIdempotencyKey() },
      );
      setReason('');
      onWrittenOff();
    } catch (err) {
      setError(err instanceof FinanceApiError ? err.message : 'Could not write off the statement.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={Boolean(statement)}
      title="Write off remaining balance"
      description={
        statement ? (
          <>
            Mark the remaining {formatMoney(statement.outstandingAmount)} on{' '}
            <span className="font-mono font-medium">{statement.statementNumber}</span> as written off.
            Prefer resolving line differences when you can; use this for the leftover after that.
          </>
        ) : null
      }
      confirmLabel="Write off"
      tone="danger"
      busy={busy}
      confirmDisabled={!reason.trim()}
      error={error}
      onCancel={() => {
        if (!busy) {
          setReason('');
          setError(undefined);
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
          placeholder="Why is the remaining balance being written off?"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
    </ConfirmDialog>
  );
}
