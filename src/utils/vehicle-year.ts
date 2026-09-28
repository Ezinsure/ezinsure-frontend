/** Calendar year of manufacture: not after current year, not more than ~100 years ago. */
export function getVehicleManufactureYearBounds(now = new Date()) {
  const y = now.getFullYear();
  return { minYear: y - 100, maxYear: y } as const;
}

/**
 * Validates a non-empty manufacture year string (digits only after trim).
 * Empty string returns null — use required rules separately.
 */
export function getVehicleManufactureYearValidationError(value: string, now = new Date()): string | null {
  const v = value.trim();
  if (v === '') return null;
  if (!/^\d+$/.test(v)) return 'Enter digits only';
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return 'Enter a valid year';
  const { minYear, maxYear } = getVehicleManufactureYearBounds(now);
  if (n < minYear || n > maxYear) {
    return `Year must be between ${minYear} and ${maxYear}`;
  }
  return null;
}
