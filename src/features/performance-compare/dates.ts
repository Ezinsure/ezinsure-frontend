/** Calendar helpers for month-to-date vs prior-month MTD compares. */

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Local calendar “today” as YYYY-MM-DD. */
export function getTodayIso(now: Date = new Date()): string {
  return formatIsoDate(now);
}

/** First day of the month containing `asOf`. */
export function getMonthStartIso(asOf: string | Date = new Date()): string {
  const date = typeof asOf === 'string' ? parseIsoDate(asOf) : new Date(asOf);
  return formatIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

/**
 * Same calendar day one month earlier.
 * Clamps when the prior month is shorter (e.g. 31 Mar → 28/29 Feb).
 */
export function getSameDayLastMonthIso(asOf: string | Date = new Date()): string {
  const date = typeof asOf === 'string' ? parseIsoDate(asOf) : new Date(asOf);
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(day, lastDay));
  return formatIsoDate(target);
}

export type PerformanceCompareRanges = {
  /** Inclusive end of current MTD (usually today). */
  asOf: string;
  /** 1st of current month. */
  currentStart: string;
  /** Same calendar day last month (clamped). */
  previousAsOf: string;
  /** 1st of previous month. */
  previousStart: string;
};

/**
 * Month-to-date windows for pulse compare:
 * - current: 1st of this month → asOf
 * - previous: 1st of last month → same day last month
 */
export function getMonthToDateCompareRanges(
  asOf: string | Date = new Date(),
): PerformanceCompareRanges {
  const end = typeof asOf === 'string' ? asOf : getTodayIso(asOf);
  const previousAsOf = getSameDayLastMonthIso(end);
  return {
    asOf: end,
    currentStart: getMonthStartIso(end),
    previousAsOf,
    previousStart: getMonthStartIso(previousAsOf),
  };
}

/** Inclusive list of YYYY-MM-DD from start through end. */
export function eachIsoDateInclusive(startIso: string, endIso: string): string[] {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (start.getTime() > end.getTime()) return [];
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    days.push(formatIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function formatCompareDayLabel(iso: string): string {
  const date = parseIsoDate(iso);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Short range label, e.g. "1–29 Sep 2026". */
export function formatCompareRangeLabel(startIso: string, endIso: string): string {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();
  if (sameMonth) {
    const monthYear = end.toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric',
    });
    return `${start.getDate()}–${end.getDate()} ${monthYear}`;
  }
  const startLabel = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const endLabel = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startLabel} – ${endLabel}`;
}
