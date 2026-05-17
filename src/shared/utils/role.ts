/** Canonical livestock field role (matches backend enum). */
export const VETERINARY_ROLE = 'VETERINARY' as const;

export function isVeterinaryRole(role: string): boolean {
  return role === VETERINARY_ROLE;
}

/** @deprecated Use isVeterinaryRole */
export function isVetRole(role: string): boolean {
  return isVeterinaryRole(role);
}

/** Normalize API role strings to app canonical values. */
export function normalizeRole(role: string): string {
  return role;
}
