/** Canonical livestock field role (matches backend enum). */
export const VETERINARY_ROLE = 'VETERINARY' as const;

const ROLE_ALIASES: Record<string, string> = {
  VET: VETERINARY_ROLE,
  VETERINARY: VETERINARY_ROLE,
  veterinary: VETERINARY_ROLE,
  vet: VETERINARY_ROLE,
};

/** Normalize API role strings to canonical app enum values. */
export function normalizeRole(role: string): string {
  const trimmed = role.trim();
  if (ROLE_ALIASES[trimmed]) {
    return ROLE_ALIASES[trimmed];
  }
  const upper = trimmed.toUpperCase();
  if (ROLE_ALIASES[upper]) {
    return ROLE_ALIASES[upper];
  }
  return upper;
}

export function isVeterinaryRole(role: string): boolean {
  return normalizeRole(role) === VETERINARY_ROLE;
}

/** @deprecated Use isVeterinaryRole */
export function isVetRole(role: string): boolean {
  return isVeterinaryRole(role);
}
