'use client';

import {
  CheckCircle2,
  CircleDashed,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { formatRwf } from '../domain';
import type { PayableLineSummary, StageReviewSummary } from '../line-review';

type Props = {
  summary: PayableLineSummary;
  /** When true, emphasise that payout uses approved lines only. */
  showPayableEmphasis?: boolean;
  /** Hide company commission from vet-facing portals. */
  showCompanyCommission?: boolean;
  /**
   * When set (admin / finance / sonarwa actively reviewing), show stage chips
   * so “needs my review” is not confused with denormalized PENDING_REVIEW.
   */
  stageSummary?: StageReviewSummary | null;
};

export function LineReviewSummaryBar({
  summary,
  showPayableEmphasis = true,
  showCompanyCommission = true,
  stageSummary = null,
}: Props) {
  const { counts } = summary;
  const showStageChips = Boolean(stageSummary);

  const payableHint = showCompanyCommission
    ? `Vet ${formatRwf(summary.totalVetCommission)} · Co. ${formatRwf(summary.totalCompanyCommission)}`
    : `Vet commission ${formatRwf(summary.totalVetCommission)}`;

  const payableValue = showCompanyCommission
    ? formatRwf(summary.totalCommission)
    : formatRwf(summary.totalVetCommission);

  const excludedValue = showCompanyCommission
    ? formatRwf(summary.excludedRejected.totalCommission)
    : formatRwf(summary.excludedRejected.totalVetCommission);

  const awaitingValue = showCompanyCommission
    ? formatRwf(summary.excludedPending.totalCommission)
    : formatRwf(summary.excludedPending.totalVetCommission);

  const needsCount = stageSummary?.needsMyReview ?? 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Line decisions
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {showStageChips
              ? 'Your review progress for this stage. Payable amounts still use the latest approved outcome.'
              : showPayableEmphasis
                ? 'Payable and reclaim amounts use approved lines only.'
                : 'Review status across insured animals in this application.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showStageChips && stageSummary ? (
            <>
              <CountChip
                icon={<UserCheck className="h-3.5 w-3.5" />}
                label="Needs your review"
                count={stageSummary.needsMyReview}
                tone="bg-amber-50 text-amber-900 ring-amber-200/80"
              />
              <CountChip
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="You approved"
                count={stageSummary.confirmedByMe}
                tone="bg-emerald-50 text-emerald-900 ring-emerald-200/80"
              />
              <CountChip
                icon={<XCircle className="h-3.5 w-3.5" />}
                label="You rejected"
                count={stageSummary.rejectedByMe}
                tone="bg-rose-50 text-rose-900 ring-rose-200/80"
              />
            </>
          ) : (
            <>
              <CountChip
                icon={<CircleDashed className="h-3.5 w-3.5" />}
                label="Pending"
                count={counts.pending}
                tone="bg-amber-50 text-amber-900 ring-amber-200/80"
              />
              <CountChip
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="Approved"
                count={counts.approved}
                tone="bg-emerald-50 text-emerald-900 ring-emerald-200/80"
              />
              <CountChip
                icon={<XCircle className="h-3.5 w-3.5" />}
                label="Rejected"
                count={counts.rejected}
                tone="bg-rose-50 text-rose-900 ring-rose-200/80"
              />
            </>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <MoneyCard
          label="Payable (approved)"
          value={payableValue}
          hint={payableHint}
          emphasis
        />
        <MoneyCard
          label="Excluded (rejected)"
          value={excludedValue}
          hint={
            counts.rejected
              ? `${counts.rejected} line${counts.rejected === 1 ? '' : 's'}`
              : 'None'
          }
        />
        <MoneyCard
          label={showStageChips ? 'Awaiting your review' : 'Awaiting decision'}
          value={
            showStageChips
              ? String(needsCount)
              : awaitingValue
          }
          hint={
            showStageChips
              ? needsCount
                ? `${needsCount} line${needsCount === 1 ? '' : 's'} still need your confirmation`
                : 'All lines confirmed for your stage'
              : counts.pending
                ? `${counts.pending} line${counts.pending === 1 ? '' : 's'}`
                : 'Fully reviewed'
          }
        />
      </div>
    </section>
  );
}

function CountChip({
  icon,
  label,
  count,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  tone: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ring-inset ${tone}`}
    >
      {icon}
      {label} · {count}
    </span>
  );
}

function MoneyCard({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        emphasis
          ? 'border-emerald-200 bg-emerald-50/50'
          : 'border-slate-200 bg-slate-50/80'
      }`}
    >
      <p className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-semibold ${
          emphasis ? 'text-emerald-950' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>
    </div>
  );
}
