/** Human-readable application status for exports */
export function formatApplicationStatus(status: string | undefined): string {
  if (!status) return '—';
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function formatRwfExport(amount: number | undefined | null): string {
  const value = Number(amount ?? 0);
  return `${value.toLocaleString('en-US')} RWF`;
}

export function formatRwfExportNumber(amount: number | undefined | null): number {
  return Number(amount ?? 0);
}

export function formatExportDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '—';
  }
}

/** Safe filename segment — strips unsafe characters */
export function sanitizeFilenameSegment(value: string): string {
  return value
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'export';
}

export function buildExportTimestamp(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `${date}_${time}`;
}
