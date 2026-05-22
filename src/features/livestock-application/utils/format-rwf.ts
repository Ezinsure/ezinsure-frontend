export function formatRwfDisplay(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') return '—';
  const n =
    typeof value === 'number'
      ? value
      : parseFloat(String(value).replace(/\s/g, '').replace(/,/g, ''));
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('en-RW')} RWF`;
}
