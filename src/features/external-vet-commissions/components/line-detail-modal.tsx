'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Receipt, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  COMMISSION_LINE_COLUMN_KEYS,
  COMMISSION_LINE_COLUMN_LABELS,
  calcBillableToSonarwa,
  calcTotalCommission,
  formatCommissionLineCell,
  formatRwf,
  type ExternalVetCommissionLineListItem,
  type ExternalVetReviewStage,
} from '../domain';
import { ExternalVetStatusBadge } from './status-badge';
import { LineDecisionTimeline } from './line-decision-timeline';
import { LineReviewDialog, type LineReviewDecision } from './line-review-dialog';
import { LineStatusBadge } from './line-status-badge';

export type LineDetailReviewConfig = {
  stage: ExternalVetReviewStage;
  busy?: boolean;
  onReview: (payload: {
    decision: LineReviewDecision;
    reason?: string;
  }) => void | Promise<void>;
};

type Props = {
  line: ExternalVetCommissionLineListItem;
  onClose: () => void;
  /** When set, shows approve / reject controls for the current stage. */
  review?: LineDetailReviewConfig | null;
};

export function LineDetailModal({ line, onClose, review }: Props) {
  const [pendingDecision, setPendingDecision] =
    useState<LineReviewDecision | null>(null);

  const isRejected = line.lineStatus === 'REJECTED';
  const showTransactionId =
    line.batchStatus === 'REIMBURSED_BY_SONARWA' ||
    Boolean(line.reimbursementReference?.trim());
  const canReview = Boolean(review);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="line-detail-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Commission line
            </p>
            <h2
              id="line-detail-title"
              className="mt-1 truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg"
            >
              {line.contract || line.clientName || `Line ${line.sn}`}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <LineStatusBadge status={line.lineStatus} size="md" />
              <ExternalVetStatusBadge status={line.batchStatus} />
              <span className="text-sm text-slate-600">{line.batchNumber}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {isRejected ? (
            <section className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-3.5">
              <h3 className="text-sm font-semibold text-rose-950">
                This line was rejected
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-rose-900/90">
                It is excluded from payable and SONARWA reclaim totals. Full
                decision history is below.
              </p>
            </section>
          ) : null}

          {showTransactionId ? (
            <section className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-teal-950">
                    SONARWA transaction ID
                  </h3>
                  <p className="mt-1 break-all font-mono text-sm font-semibold text-teal-950">
                    {line.reimbursementReference?.trim() || 'Not recorded'}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Veterinary agent
            </h3>
            <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd className="font-medium text-slate-900">
                  {line.payee?.name || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-900">
                  {line.payee?.phoneNumber || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">District</dt>
                <dd className="font-medium text-slate-900">
                  {line.payee?.district || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Sector</dt>
                <dd className="font-medium text-slate-900">
                  {line.payee?.sector || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Request date</dt>
                <dd className="font-medium text-slate-900">
                  {line.payee?.commissionRequestDate || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Bank</dt>
                <dd className="font-medium text-slate-900">
                  {line.payee?.bankName || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Account</dt>
                <dd className="font-medium text-slate-900">
                  {line.payee?.bankAccountNumber || '—'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Net premium"
              value={formatRwf(line.netPremium)}
              muted={isRejected}
            />
            <Metric
              label="Vet commission"
              value={formatRwf(line.vetCommission)}
              muted={isRejected}
            />
            <Metric
              label="Company commission"
              value={formatRwf(line.companyCommission)}
              muted={isRejected}
            />
            <Metric
              label="Total + VAT (18%)"
              value={formatRwf(
                calcBillableToSonarwa(
                  calcTotalCommission(
                    line.vetCommission,
                    line.companyCommission,
                  ),
                ),
              )}
              muted={isRejected}
            />
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Decision timeline
            </h3>
            <LineDecisionTimeline events={line.reviewEvents ?? []} />
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              Line details
            </h3>
            <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              {COMMISSION_LINE_COLUMN_KEYS.map((key) => (
                <div key={key}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {COMMISSION_LINE_COLUMN_LABELS[key]}
                  </dt>
                  <dd
                    className={`mt-0.5 text-sm text-slate-900 ${
                      isRejected &&
                      (key === 'vetCommission' ||
                        key === 'companyCommission' ||
                        key === 'netPremium' ||
                        key === 'sumInsured')
                        ? 'text-slate-500 line-through decoration-rose-300'
                        : ''
                    }`}
                  >
                    {formatCommissionLineCell(line, key)}
                  </dd>
                </div>
              ))}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Period
                </dt>
                <dd className="mt-0.5 text-sm text-slate-900">
                  {line.periodLabel || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Paid at
                </dt>
                <dd className="mt-0.5 text-sm text-slate-900">
                  {line.paidAt
                    ? new Date(line.paidAt).toLocaleString()
                    : '—'}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          {canReview && review ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={review.busy}
                onClick={() => setPendingDecision('APPROVED')}
                className="flex-1 sm:flex-none"
              >
                {review.busy ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                Approve line
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={review.busy}
                onClick={() => setPendingDecision('REJECTED')}
                className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50 sm:flex-none"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Reject line
              </Button>
            </div>
          ) : (
            <span className="hidden sm:block" />
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </div>
      </div>

      {review ? (
        <LineReviewDialog
          open={pendingDecision != null}
          decision={pendingDecision}
          stage={review.stage}
          lineLabel={
            line.contract || line.clientName || `Line ${line.sn}`
          }
          busy={review.busy}
          onClose={() => setPendingDecision(null)}
          onConfirm={async (payload) => {
            await review.onReview(payload);
            setPendingDecision(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1 font-semibold text-slate-900 ${
          muted ? 'text-slate-500 line-through decoration-rose-300' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}
