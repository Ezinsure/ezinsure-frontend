'use client';

import { FileText, MessageSquareText, Stamp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  LivestockApplicationViewRole,
  SonarwaReviewRecord,
} from '@/features/livestock-application/domain/application-types';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';

interface SonarwaReviewSummaryProps {
  review: SonarwaReviewRecord;
  viewRole?: LivestockApplicationViewRole;
  onViewDocument?: (name: string, path: string) => void;
  /** Compact card without outer section chrome (for nesting inside workflow cards). */
  compact?: boolean;
}

function decisionLabel(decision: SonarwaReviewRecord['decision']): string {
  switch (decision) {
    case 'APPROVED_WITH_CHANGES':
      return 'Approved with changes';
    case 'REJECTED':
      return 'Rejected';
    default:
      return 'Approved';
  }
}

function decisionBadgeClass(decision: SonarwaReviewRecord['decision']): string {
  switch (decision) {
    case 'APPROVED_WITH_CHANGES':
      return 'bg-amber-100 text-amber-900';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-emerald-100 text-emerald-800';
  }
}

function formatReviewedAt(value: string): string {
  try {
    return new Date(value).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

export function SonarwaReviewSummary({
  review,
  viewRole = 'vet',
  onViewDocument,
  compact = false,
}: SonarwaReviewSummaryProps) {
  const showReviewedBy = viewRole === 'admin' || viewRole === 'super_admin';
  const hasCommissionChange =
    review.originalVeterinaryCommission != null || review.updatedVeterinaryCommission != null;

  const body = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${decisionBadgeClass(review.decision)}`}
        >
          {decisionLabel(review.decision)}
        </span>
        <span className="text-xs text-slate-500">{formatReviewedAt(review.reviewedAt)}</span>
      </div>

      {showReviewedBy && (review.reviewedByName || review.reviewedByUserId) && (
        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Reviewed by
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {review.reviewedByName || 'SONARWA representative'}
          </p>
        </div>
      )}

      {review.changeComment?.trim() && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                SONARWA comment
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-amber-950">
                {review.changeComment.trim()}
              </p>
            </div>
          </div>
        </div>
      )}

      {hasCommissionChange && (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {review.originalVeterinaryCommission != null && (
            <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Original vet commission
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {formatRwfDisplay(review.originalVeterinaryCommission)}
              </dd>
            </div>
          )}
          {review.updatedVeterinaryCommission != null && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Updated vet commission
              </dt>
              <dd className="mt-1 text-sm font-semibold text-emerald-950">
                {formatRwfDisplay(review.updatedVeterinaryCommission)}
              </dd>
            </div>
          )}
        </dl>
      )}

      {review.correctionDocumentUrl && onViewDocument && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onViewDocument('SONARWA correction document', review.correctionDocumentUrl!)
          }
        >
          <FileText className="mr-2 h-4 w-4" />
          View correction document
        </Button>
      )}
    </div>
  );

  if (compact) return body;

  return (
    <section className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/50 to-white p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-teal-100 p-3">
          <Stamp className="h-6 w-6 text-teal-800" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">SONARWA review outcome</h2>
          <p className="mt-1 text-sm text-slate-600">
            Decision and comments from the SONARWA representative.
          </p>
        </div>
      </div>
      <div className="mt-5">{body}</div>
    </section>
  );
}
