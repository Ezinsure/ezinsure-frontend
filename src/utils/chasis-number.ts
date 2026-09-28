/** Application-like object that may include a chassis number from the API. */
export type ChasisNumberSource = {
  chasisNumber?: string | null;
  vehicle?: { chasisNumber?: string | null } | null;
};

/** Normalise API value — treats null/undefined as empty string. */
export function resolveChasisNumber(source?: ChasisNumberSource | null): string {
  const root = source?.chasisNumber;
  const nested = source?.vehicle?.chasisNumber;
  return String(root ?? nested ?? '').trim();
}

/** Display label for UI tables and detail panels. */
export function formatChasisNumberDisplay(
  source?: ChasisNumberSource | null,
  emptyLabel = '—',
): string {
  const value = resolveChasisNumber(source);
  return value || emptyLabel;
}
