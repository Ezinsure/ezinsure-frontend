/** Calendar helpers for “today vs same day last month” compares. */

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

export function formatCompareDayLabel(iso: string): string {
  const date = parseIsoDate(iso);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
