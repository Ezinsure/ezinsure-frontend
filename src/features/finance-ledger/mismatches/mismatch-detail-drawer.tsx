'use client';

import Link from 'next/link';
import { formatMoney } from '@/utils/money';
import {
  MISMATCH_KIND_LABELS,
  MISMATCH_REASON_LABELS,
  type Mismatch,
} from '../domain';
import { Drawer } from '../ui/drawer';
import { formatLocalDate, formatLocalDateTime } from '../ui/format-local-date';
import { MoneyCell } from '../ui/money-cell';
import { MismatchStatusChip } from './mismatch-status-chip';

interface MismatchDetailDrawerProps {
  mismatch: Mismatch | undefined;
  onClose: () => void;
  onResolve: () => void;
}

export function MismatchDetailDrawer({ mismatch, onClose, onResolve }: MismatchDetailDrawerProps) {
  return (
    <Drawer
      open={Boolean(mismatch)}
      onClose={onClose}
      title="Difference details"
      eyebrow="Reconciliation"
    >
      {mismatch ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-semibold text-slate-900">
              {mismatch.contractNumber}
            </span>
            <MismatchStatusChip status={mismatch.status} />
          </div>

          <p className="text-sm text-slate-600">{MISMATCH_KIND_LABELS[mismatch.kind]}</p>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Expected</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {formatMoney(mismatch.expectedAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">SONARWA paid</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {formatMoney(mismatch.sonarwaAmount)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Difference</dt>
              <dd className="mt-0.5">
                <MoneyCell
                  value={mismatch.differenceAmount}
                  signed
                  tinted
                  className="text-left text-lg font-semibold"
                />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Statement</dt>
              <dd className="mt-0.5 font-mono text-slate-800">{mismatch.statementNumber}</dd>
            </div>
            {mismatch.vetName ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Vet</dt>
                <dd className="mt-0.5 text-slate-800">{mismatch.vetName}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Opened</dt>
              <dd className="mt-0.5">{formatLocalDateTime(mismatch.createdAt)}</dd>
            </div>
            {mismatch.resolvedAt ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Resolved</dt>
                <dd className="mt-0.5">{formatLocalDate(mismatch.resolvedAt)}</dd>
                {mismatch.resolvedBy ? (
                  <dd className="text-xs text-slate-500">{mismatch.resolvedBy.name}</dd>
                ) : null}
              </div>
            ) : null}
            {mismatch.reasonCode ? (
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Reason</dt>
                <dd className="mt-0.5 text-slate-800">{MISMATCH_REASON_LABELS[mismatch.reasonCode]}</dd>
              </div>
            ) : null}
            {mismatch.note ? (
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Note</dt>
                <dd className="mt-0.5 text-slate-800">{mismatch.note}</dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-wrap gap-2">
            {mismatch.status === 'OPEN' ? (
              <button
                type="button"
                onClick={onResolve}
                className="cursor-pointer rounded-lg bg-[var(--portal-primary)] px-3 py-2 text-sm font-medium text-white"
              >
                Resolve
              </button>
            ) : null}
            {mismatch.lineId ? (
              <Link
                href={`/finance/livestock/ledger?line=${encodeURIComponent(mismatch.lineId)}`}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Open line timeline
              </Link>
            ) : null}
            <Link
              href={`/finance/livestock/statements?statement=${encodeURIComponent(mismatch.statementId)}`}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Open statement
            </Link>
          </div>
        </>
      ) : null}
    </Drawer>
  );
}
