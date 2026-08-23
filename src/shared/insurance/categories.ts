/**
 * Shared motor (and general non-livestock) insurance category vocabulary.
 * Labels match values stored by the API / existing applications.
 */

export type MotorInsuranceCategoryValue =
  | 'car'
  | 'motorbike'
  | 'building'
  | 'travel'
  | 'health'
  | 'fire'
  | 'tourist'
  | 'rc_bateau';

export interface InsuranceCategoryOption {
  /** Short form key used on public/agent apply forms. */
  value: MotorInsuranceCategoryValue;
  /** Canonical label persisted on applications. */
  label: string;
  /** Alternate labels accepted when matching existing records. */
  aliases?: string[];
}

/** Full catalog used in staff apply / renewals / filters. */
export const MOTOR_INSURANCE_CATEGORIES: InsuranceCategoryOption[] = [
  { value: 'car', label: 'Car Insurance' },
  { value: 'motorbike', label: 'MotorBike Insurance', aliases: ['Motorbike Insurance', 'Moto Insurance'] },
  { value: 'rc_bateau', label: 'RC Bateau' },
  { value: 'building', label: 'Building Insurance' },
  { value: 'travel', label: 'Travel Insurance' },
  { value: 'health', label: 'Health Insurance' },
  {
    value: 'fire',
    label: 'Fire Insurance Coverage',
    aliases: ['Fire Insurance'],
  },
  { value: 'tourist', label: 'Tourist Insurance' },
];

/** Categories shown on public / agent self-serve apply forms. */
export const PUBLIC_APPLY_INSURANCE_CATEGORIES: InsuranceCategoryOption[] = [
  { value: 'car', label: 'Car Insurance' },
  { value: 'motorbike', label: 'MotorBike Insurance' },
  { value: 'building', label: 'Building Insurance' },
  { value: 'travel', label: 'Travel Insurance' },
  { value: 'health', label: 'Health Insurance' },
  { value: 'fire', label: 'Fire Insurance Coverage', aliases: ['Fire Insurance'] },
  { value: 'tourist', label: 'Tourist Insurance' },
];

/** Labels used in filter dropdowns (canonical + common aliases collapsed). */
export const INSURANCE_CATEGORY_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'Car Insurance', label: 'Car Insurance' },
  { value: 'MotorBike Insurance', label: 'MotorBike Insurance' },
  { value: 'RC Bateau', label: 'RC Bateau' },
  { value: 'Building Insurance', label: 'Building Insurance' },
  { value: 'Travel Insurance', label: 'Travel Insurance' },
  { value: 'Health Insurance', label: 'Health Insurance' },
  { value: 'Fire Insurance Coverage', label: 'Fire Insurance' },
  { value: 'Tourist Insurance', label: 'Tourist Insurance' },
];

export function formatInsuranceCategoryLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  const match = MOTOR_INSURANCE_CATEGORIES.find(
    (c) =>
      c.value === normalized ||
      c.label.toLowerCase() === normalized ||
      c.aliases?.some((a) => a.toLowerCase() === normalized),
  );
  return match?.label ?? value;
}

/** True when two category strings refer to the same product type. */
export function insuranceCategoriesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (left === right) return true;
  const leftCanonical = formatInsuranceCategoryLabel(a).toLowerCase();
  const rightCanonical = formatInsuranceCategoryLabel(b).toLowerCase();
  return leftCanonical === rightCanonical;
}

export function isVehicleInsuranceCategory(category: string): boolean {
  const c = (category || '').toLowerCase();
  return c.includes('car') || c.includes('motor') || c.includes('moto') || c.includes('motorbike');
}
