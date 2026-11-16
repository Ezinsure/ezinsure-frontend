import { addDays, toDateOnly, type DateOnly } from '../domain';

export interface DateSpan {
  from: DateOnly;
  to: DateOnly;
}

export const PERIOD_PRESET_IDS = ['thisMonth', 'lastMonth', 'fortnight', 'quarter'] as const;
export type PeriodPresetId = (typeof PERIOD_PRESET_IDS)[number];

export const PERIOD_PRESET_LABELS: Record<PeriodPresetId, string> = {
  thisMonth: 'This month',
  lastMonth: 'Last month',
  fortnight: 'Last 14 days',
  quarter: 'This quarter',
};

/**
 * Resolves a preset to concrete local dates. Built from local date parts and
 * never `toISOString()`, which shifts days in timezones ahead of UTC.
 */
export function resolvePeriodPreset(id: PeriodPresetId, now: Date = new Date()): DateSpan {
  const today = toDateOnly(now);
  switch (id) {
    case 'thisMonth':
      return { from: toDateOnly(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case 'lastMonth':
      return {
        from: toDateOnly(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toDateOnly(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case 'fortnight':
      return { from: toDateOnly(addDays(now, -13)), to: today };
    case 'quarter': {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return { from: toDateOnly(new Date(now.getFullYear(), quarterStartMonth, 1)), to: today };
    }
  }
}

/** The preset whose dates equal `span`, or `undefined` for a custom range. */
export function detectPeriodPreset(span: DateSpan, now: Date = new Date()): PeriodPresetId | undefined {
  return PERIOD_PRESET_IDS.find((id) => {
    const candidate = resolvePeriodPreset(id, now);
    return candidate.from === span.from && candidate.to === span.to;
  });
}

/** `from` and `to` must both be set and in order. */
export const isValidSpan = (span: Partial<DateSpan>): span is DateSpan =>
  Boolean(span.from && span.to && span.from <= span.to);
