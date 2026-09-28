export function isoDateOnly(value: string | undefined | null): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatLocalIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addCalendarDays(iso: string, days: number): string {
  const [year, month, day] = isoDateOnly(iso).split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatLocalIsoDate(date);
}

export function addCalendarYears(iso: string, years: number): string {
  const [year, month, day] = isoDateOnly(iso).split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(year, month - 1, day);
  date.setFullYear(date.getFullYear() + years);
  return formatLocalIsoDate(date);
}

/** Next cover period: starts the day after previous end, lasts one year. */
export function nextPolicyPeriod(previousEndIso: string): { start: string; end: string } {
  const previousEnd = isoDateOnly(previousEndIso);
  const start = addCalendarDays(previousEnd, 1);
  const end = addCalendarYears(previousEnd, 1);
  return { start, end };
}
