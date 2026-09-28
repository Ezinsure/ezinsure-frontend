/** Human-readable label for veterinarian type stored on user records. */
export function formatVeterinaryType(type?: string | null): string | undefined {
  const normalized = String(type ?? '').trim().toUpperCase();
  if (!normalized) return undefined;
  if (normalized === 'PRIVATE') return 'Private';
  if (normalized === 'SARO') return 'SARO (Government vet)';
  return String(type).trim();
}
