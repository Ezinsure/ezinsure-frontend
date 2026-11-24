'use client';

import { useCallback, useEffect, useState } from 'react';
import { addDays, toDateOnly, type Statement } from '../domain';
import { FinanceApiError } from '../api/http';
import { useFinanceLedgerApi } from '../api/use-finance-ledger-api';
import { useAsyncResource } from '../hooks/use-async-resource';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { newIdempotencyKey } from '../ui/idempotency';
import { formatMoney } from '@/utils/money';
import { Skeleton } from '../ui/skeleton';

interface IssueStatementDialogProps {
  statement: Statement | undefined;
  onClose: () => void;
  onIssued: () => void;
}

export function IssueStatementDialog({ statement, onClose, onIssued }: IssueStatementDialogProps) {
  const api = useFinanceLedgerApi();
  const id = statement?.id;
  const checksFetcher = useCallback(
    (signal: AbortSignal) => {
      if (!id) {
        return Promise.resolve({ canIssue: false, blockers: [], warnings: [] });
      }
      return api.getStatementIssueChecks(id, { signal });
    },
    [api, id],
  );
  const checks = useAsyncResource(checksFetcher, { enabled: Boolean(id) });

  const [dueAt, setDueAt] = useState('');
  const [note, setNote] = useState('');
  const [acknowledge, setAcknowledge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!statement) return;
    setDueAt(toDateOnly(addDays(new Date(), 30)));
    setNote('');
    setAcknowledge(false);
    setError(undefined);
  }, [statement]);

  const warnings = checks.data?.warnings ?? [];
  const blockers = checks.data?.blockers ?? [];
  const canIssue =
    Boolean(checks.data?.canIssue) && blockers.length === 0 && (warnings.length === 0 || acknowledge);

  const handleConfirm = async () => {
    if (!statement) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.issueStatement(
        statement.id,
        {
          dueAt: dueAt || undefined,
          note: note.trim() || undefined,
          acknowledgeWarnings: warnings.length > 0 ? acknowledge : undefined,
        },
        { idempotencyKey: newIdempotencyKey() },
      );
      onIssued();
    } catch (err) {
      setError(err instanceof FinanceApiError ? err.message : 'Could not issue the statement.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={Boolean(statement)}
      title="Issue statement to SONARWA"
      description={
        statement ? (
          <>
            Freeze the amounts on{' '}
            <span className="font-mono font-medium">{statement.statementNumber}</span> and bill SONARWA
            for {formatMoney(statement.amountDue)}. Lines move to <strong>Billed to SONARWA</strong>.
          </>
        ) : null
      }
      confirmLabel="Issue statement"
      busy={busy}
      confirmDisabled={!canIssue || checks.loading}
      error={error ?? checks.error}
      onCancel={() => {
        if (!busy) onClose();
      }}
      onConfirm={handleConfirm}
    >
      {checks.loading ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        <>
          {blockers.length > 0 ? (
            <ul className="space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {blockers.map((b) => (
                <li key={b.code}>{b.message}</li>
              ))}
            </ul>
          ) : null}

          {warnings.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <ul className="space-y-1">
                {warnings.map((w) => (
                  <li key={w.code}>{w.message}</li>
                ))}
              </ul>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={acknowledge}
                  onChange={(e) => setAcknowledge(e.target.checked)}
                  disabled={busy}
                  className="mt-0.5"
                />
                <span>I understand and want to issue anyway</span>
              </label>
            </div>
          ) : null}

          {statement ? (
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">Lines</dt>
                <dd className="mt-0.5 font-semibold">{statement.lineCount}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">Amount due</dt>
                <dd className="mt-0.5 font-semibold">{formatMoney(statement.amountDue)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">Vet commission</dt>
                <dd className="mt-0.5">{formatMoney(statement.vetCommissionTotal)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">Company + VAT</dt>
                <dd className="mt-0.5">
                  {formatMoney(statement.companyCommissionTotal + statement.vatAmount)}
                </dd>
              </div>
            </dl>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Due date
            </span>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

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
