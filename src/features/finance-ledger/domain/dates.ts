import { toDateInputValue } from '@/utils/date-formatter';
import type { DateOnly } from './common';

const DAY_MS = 86_400_000;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const toDateOnly = (date: Date): DateOnly => toDateInputValue(date);

export function isDateOnly(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Parses `YYYY-MM-DD` as a local date (never UTC, to avoid off-by-one days). */
export function parseDateOnly(value: DateOnly): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function diffInDays(from: Date | string, to: Date | string): number {
  const start = typeof from === 'string' ? new Date(from) : from;
  const end = typeof to === 'string' ? new Date(to) : to;
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS);
}

export interface MonthPeriod {
  /** `YYYY-MM` */
  key: string;
  from: DateOnly;
  to: DateOnly;
}

export function monthPeriod(year: number, monthIndex: number): MonthPeriod {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  return {
    key: `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}`,
    from: toDateOnly(first),
    to: toDateOnly(last),
  };
}

/** Every calendar month touched by `[from, to]`, oldest first. */
export function listMonthPeriods(from: DateOnly, to: DateOnly): MonthPeriod[] {
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);
  const months: MonthPeriod[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor.getTime() <= end.getTime()) {
    months.push(monthPeriod(cursor.getFullYear(), cursor.getMonth()));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}
