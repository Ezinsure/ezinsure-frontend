export interface LivestockLocationFields {
  province?: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
}

export function extractLivestockLocation(
  record: Record<string, unknown>,
): LivestockLocationFields {
  return {
    province: pick(record.livestockProvince ?? record.province),
    district: pick(record.livestockDistrict ?? record.district) ?? '',
    sector: pick(record.livestockSector ?? record.sector) ?? '',
    cell: pick(record.livestockCell ?? record.cell) ?? '',
    village: pick(record.livestockVillage ?? record.village) ?? '',
  };
}

function pick(value: unknown): string | undefined {
  const s = String(value ?? '').trim();
  return s || undefined;
}

/** Short label for tables, e.g. "Kayonza, Ruramira". */
export function formatLocationSummary(location: LivestockLocationFields): string {
  const parts = [location.district, location.sector].filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  return [location.village, location.cell].filter(Boolean).join(', ') || '—';
}

/** Full address for detail views. */
export function formatLocationFull(location: LivestockLocationFields): string {
  return [location.village, location.cell, location.sector, location.district, location.province]
    .filter(Boolean)
    .join(', ');
}

export function formatPolicyDate(iso?: string): string {
  if (!iso?.trim()) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatSubmittedDateTime(iso?: string): string {
  if (!iso?.trim()) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
