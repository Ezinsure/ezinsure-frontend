/** Inclusive calendar month-to-date range in local timezone (`YYYY-MM-DD`). */
export function getMonthToDateRange(now: Date = new Date()): {
  startDate: string;
  endDate: string;
} {
  const year = now.getFullYear();
  const month = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    startDate: `${year}-${pad(month + 1)}-01`,
    endDate: `${year}-${pad(month + 1)}-${pad(now.getDate())}`,
  };
}
