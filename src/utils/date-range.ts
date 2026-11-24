import { toDateInputValue } from '@/utils/date-formatter';

/** Inclusive calendar date range, both ends `YYYY-MM-DD` in the user's local timezone. */
export type LocalDateRange = {
  startDate: string;
  endDate: string;
};

/**
 * Month-to-date range in local time.
 *
 * Never build these with `toISOString().slice(0, 10)`: in UTC+ timezones local
 * midnight is the previous UTC day, so "1 Nov" would silently become "31 Oct".
 */
export function getMonthToDateRange(now: Date = new Date()): LocalDateRange {
  return {
    startDate: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toDateInputValue(now),
  };
}

/** Full calendar month (`month` is 1–12) in local time. */
export function getFullMonthRange(year: number, month: number): LocalDateRange {
  return {
    startDate: toDateInputValue(new Date(year, month - 1, 1)),
    endDate: toDateInputValue(new Date(year, month, 0)),
  };
}
