'use client';

import { CheckCircle2, MessageSquareWarning, XCircle } from 'lucide-react';
import {
  EXTERNAL_VET_REVIEW_STAGE_LABELS,
  type ExternalVetLineReviewEvent,
} from '../domain';

function formatWhen(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LineDecisionTimeline({
  events,
  emptyLabel = 'No review decisions yet on this line.',
}: {
  events: ExternalVetLineReviewEvent[];
  emptyLabel?: string;
}) {
  if (!events.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
        {emptyLabel}
      </p>
    );
  }

  const ordered = [...events].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  return (
    <ol className="relative space-y-0 border-l border-slate-200 pl-4 sm:pl-5">
      {ordered.map((event) => {
        const rejected = event.decision === 'REJECTED';
        return (
          <li key={event.id} className="relative pb-5 last:pb-0">
            <span
              className={`absolute -left-[21px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white sm:-left-[25px] ${
                rejected ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}
              aria-hidden
            >
              {rejected ? (
                <XCircle className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
            </span>

            <div
              className={`rounded-xl border px-3.5 py-3 ${
                rejected
                  ? 'border-rose-200/80 bg-rose-50/60'
                  : 'border-emerald-200/80 bg-emerald-50/50'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    rejected ? 'text-rose-800' : 'text-emerald-800'
                  }`}
                >
                  {rejected ? 'Rejected' : 'Approved'}
                </span>
                <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/80">
                  {EXTERNAL_VET_REVIEW_STAGE_LABELS[event.stage]}
                </span>
              </div>

              <p className="mt-1.5 text-sm font-medium text-slate-900">
                {event.actorName}
                {event.actorRole ? (
                  <span className="font-normal text-slate-500">
                    {' '}
                    · {event.actorRole}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{formatWhen(event.at)}</p>

              {event.reason?.trim() ? (
                <div className="mt-2.5 flex gap-2 rounded-lg bg-white/70 px-2.5 py-2 text-sm text-slate-700 ring-1 ring-slate-200/70">
                  <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <p className="min-w-0 break-words leading-relaxed">
                    {event.reason.trim()}
                  </p>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
