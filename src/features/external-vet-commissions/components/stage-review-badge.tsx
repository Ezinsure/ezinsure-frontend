'use client';

import {
  lineStageReviewLabel,
  type LineStageReviewState,
} from '../line-review';

const TONE: Record<
  Exclude<LineStageReviewState, 'not_in_my_queue'>,
  { wrap: string; dot: string }
> = {
  needs_my_review: {
    wrap: 'bg-amber-50 text-amber-900 ring-amber-200/80',
    dot: 'bg-amber-500',
  },
  confirmed_by_me: {
    wrap: 'bg-emerald-50 text-emerald-900 ring-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  rejected_by_me: {
    wrap: 'bg-rose-50 text-rose-900 ring-rose-200/80',
    dot: 'bg-rose-500',
  },
};

export function StageReviewBadge({
  state,
  size = 'sm',
}: {
  state: LineStageReviewState;
  size?: 'sm' | 'md';
}) {
  if (state === 'not_in_my_queue') return null;

  const tone = TONE[state];
  const padding = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-1 text-[11px]';
  const label = lineStageReviewLabel(state);

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md font-semibold leading-none tracking-wide ring-1 ring-inset ${padding} ${tone.wrap}`}
      title={label}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`}
        aria-hidden
      />
      <span className="truncate whitespace-nowrap">{label}</span>
    </span>
  );
}
