import { addDays, toDateOnly, type DateOnly } from '../domain';

export interface DateSpan {
  from: DateOnly;
  to: DateOnly;
}

export const PERIOD_PRESET_IDS = [
  'thisMonth',
  'lastMonth',
  'fortnight',
  'quarter',
  'sixMonths',
  'thisYear',
] as const;
export type PeriodPresetId = (typeof PERIOD_PRESET_IDS)[number];

export const PERIOD_PRESET_LABELS: Record<PeriodPresetId, string> = {
  thisMonth: 'This month',
  lastMonth: 'Last month',
  fortnight: 'Last 14 days',
  quarter: 'This quarter',
  sixMonths: 'Last 6 months',
  thisYear: 'This year',
};

/** What the picker offers when a page does not choose its own list. */
export const DEFAULT_PERIOD_PRESETS: readonly PeriodPresetId[] = [
  'thisMonth',
  'lastMonth',
  'fortnight',
  'quarter',
];

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
    case 'sixMonths':
      // The current month plus the five before it.
      return { from: toDateOnly(new Date(now.getFullYear(), now.getMonth() - 5, 1)), to: today };
    case 'thisYear':
      return { from: toDateOnly(new Date(now.getFullYear(), 0, 1)), to: today };
  }
}

/** The preset whose dates equal `span`, or `undefined` for a custom range. */
export function detectPeriodPreset(
  span: DateSpan,
  now: Date = new Date(),
  candidates: readonly PeriodPresetId[] = PERIOD_PRESET_IDS,
): PeriodPresetId | undefined {
  return candidates.find((id) => {
    const candidate = resolvePeriodPreset(id, now);
    return candidate.from === span.from && candidate.to === span.to;
  });
}

/** `from` and `to` must both be set and in order. */
export const isValidSpan = (span: Partial<DateSpan>): span is DateSpan =>
  Boolean(span.from && span.to && span.from <= span.to);
