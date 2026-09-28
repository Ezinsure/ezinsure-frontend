export function formatIsoDateOnly(value: string | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export function startOfTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysFromToday(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function expiryRelativeLabel(daysUntilExpiry: number | undefined): string {
  if (daysUntilExpiry == null) return '';
  const abs = Math.abs(daysUntilExpiry);
  const unit = abs === 1 ? 'day' : 'days';
  if (daysUntilExpiry < 0) return `${abs} ${unit} ago`;
  if (daysUntilExpiry === 0) return 'Today';
  return `in ${abs} ${unit}`;
}
