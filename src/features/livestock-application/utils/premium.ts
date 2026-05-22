import type { LivestockAnimalRow } from '@/features/livestock-application/types';

/** Default premium rate (%) by animal type — adjust when product rules are finalized */
export const PREMIUM_RATE_PERCENT_BY_ANIMAL_TYPE: Record<string, number> = {
  Inka: 5.5,
  Inkoko: 8,
  Ingurube: 6,
};

const DEFAULT_RATE = 5.5;

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
