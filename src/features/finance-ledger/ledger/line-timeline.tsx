import type { LineTimelineEvent } from '../domain';
import { CHIP_DOT_CLASSES } from '../ui/tones';
import { cx } from '../ui/cx';
import { formatLocalDateTime } from '../ui/format-local-date';
import { formatMoney } from '@/utils/money';
import { LINE_TIMELINE_META } from './timeline-meta';

interface LineTimelineProps {
  events: readonly LineTimelineEvent[];
}

/** Vertical story of one line from submission to reimbursement. */
export function LineTimeline({ events }: LineTimelineProps) {
  if (!events.length) {
    return <p className="text-sm text-slate-500">No timeline events yet.</p>;
  }

  return (
    <ol className="relative space-y-0 border-l border-slate-200 ml-2">
      {events.map((event, index) => {
        const meta = LINE_TIMELINE_META[event.type];
        const isLast = index === events.length - 1;
        return (
          <li key={event.id} className={cx('relative pl-5', !isLast && 'pb-5')}>
            <span
              aria-hidden
              className={cx(
                'absolute -left-1.5 top-1.5 h-3 w-3 rounded-full ring-2 ring-white',
                CHIP_DOT_CLASSES[meta.tone],
              )}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-sm font-medium text-slate-900">{meta.label}</p>
              <time dateTime={event.at} className="text-xs tabular-nums text-slate-500">
                {formatLocalDateTime(event.at)}
              </time>
            </div>
            {event.actor ? (
              <p className="mt-0.5 text-xs text-slate-500">
                {event.actor.name}
                {event.actor.role ? ` · ${event.actor.role}` : ''}
              </p>
            ) : null}
            {event.amount !== undefined ? (
              <p className="mt-0.5 text-sm tabular-nums text-slate-700">{formatMoney(event.amount)}</p>
            ) : null}
            {event.reference ? (
              <p className="mt-0.5 font-mono text-xs text-slate-600">{event.reference}</p>
            ) : null}
            {event.note ? <p className="mt-1 text-xs text-slate-500">{event.note}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}
