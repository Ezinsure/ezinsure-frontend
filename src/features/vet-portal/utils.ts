export function formatRwf(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0 RWF';
  return `${Math.round(n).toLocaleString()} RWF`;
}

export function formatStatusLabel(status: string | undefined | null): string {
  if (!status) return 'Unknown';
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
