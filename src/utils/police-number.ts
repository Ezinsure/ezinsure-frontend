/** Application-like object that may include a police / policy reference number from the API. */
export type PoliceNumberSource = {
  policeNumber?: string | null;
};

/** Normalise API value — treats null/undefined as empty string. */
export function resolvePoliceNumber(source?: PoliceNumberSource | null): string {
  return String(source?.policeNumber ?? '').trim();
}

/** Display label for UI tables and detail panels. */
export function formatPoliceNumberDisplay(
  source?: PoliceNumberSource | null,
  emptyLabel = '—',
): string {
  const value = resolvePoliceNumber(source);
  return value || emptyLabel;
}
