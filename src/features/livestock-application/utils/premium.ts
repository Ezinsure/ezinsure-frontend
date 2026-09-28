import type { LivestockAnimalRow } from '@/features/livestock-application/types';

/**
 * Fixed premium rate (%) by animal type.
 * Cattle (Inka) & poultry (Inkoko) = 5.5%, pigs (Ingurube) = 6%.
 * This is the single source of truth; the form auto-fills it and vets cannot edit it.
 */
export const PREMIUM_RATE_PERCENT_BY_ANIMAL_TYPE: Record<string, number> = {
  Inka: 5.5,
  Inkoko: 5.5,
  Ingurube: 6,
};

const DEFAULT_RATE = 5.5;

/** Fixed premium rate (%) for a given animal type. */
export function premiumPercentForAnimalType(animalType?: string): number {
  const key = animalType?.trim() ?? '';
  return PREMIUM_RATE_PERCENT_BY_ANIMAL_TYPE[key] ?? DEFAULT_RATE;
}

export function suggestPremiumPercentage(items: LivestockAnimalRow[]): string {
  const types = items.map((i) => i.animalType.trim()).filter(Boolean);
  if (types.length === 0) return '';

  const rates = types.map((t) => PREMIUM_RATE_PERCENT_BY_ANIMAL_TYPE[t] ?? DEFAULT_RATE);
  const average = rates.reduce((sum, r) => sum + r, 0) / rates.length;
  return formatPremiumPercent(average);
}

export function formatPremiumPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function isValidPremiumPercentInput(value: string): boolean {
  if (!value.trim()) return true;
  return /^\d+(\.\d)?$/.test(value.trim());
}
