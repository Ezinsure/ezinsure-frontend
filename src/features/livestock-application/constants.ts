export const LIVESTOCK_BREED_OPTIONS = [
  { value: 'Boran', label: 'Boran' },
  { value: 'Brown swiss', label: 'Brown swiss' },
  { value: 'Exotic', label: 'Exotic' },
  { value: 'Fresian', label: 'Fresian' },
  { value: 'Jersey', label: 'Jersey' },
  { value: 'Local', label: 'Local' },
  { value: 'Other', label: 'Other' },
] as const;

export const GIRINKA_OPTIONS = [
  { value: 'yes', label: 'Yego' },
  { value: 'no', label: 'Oya' },
] as const;

export const OWNER_GENDER_OPTIONS = [
  { value: 'male', label: 'GABO' },
  { value: 'female', label: 'GORE' },
] as const;

/** Maps to API `animalType` / Tekana `Type` where applicable */
export const LIVESTOCK_ANIMAL_TYPE_OPTIONS = [
  { value: 'Inka', label: 'Inka' },
  { value: 'Inkoko', label: 'Inkoko' },
  { value: 'Ingurube', label: 'Ingurube' },
] as const;

/** Maps to API `sex` (Imbyeyi ≈ female, Imfizi ≈ male) */
export const LIVESTOCK_ANIMAL_CATEGORY_OPTIONS = [
  { value: 'Imbyeyi', label: 'Imbyeyi' },
  { value: 'Imfizi', label: 'Imfizi' },
] as const;

export const YES_NO_OPTIONS = [
  { value: 'Yego', label: 'Yego' },
  { value: 'Oya', label: 'Oya' },
] as const;

export const VET_AVAILABILITY_OPTIONS = [
  { value: 'Uhoraho', label: 'Uhoraho' },
  { value: 'Uza rimwe na rimwe', label: 'Uza rimwe na rimwe' },
] as const;

export const LIVESTOCK_BULK_IMPORT_HEADERS = [
  'animalType',
  'animalCategory',
  'animalAge',
  'chipNumber',
  'breed',
  'vaccinationInfo',
  'color',
  'productivity',
  'sumAssured',
] as const;

export const POULTRY_PRODUCT_OPTIONS = [
  { value: 'EGG_LAYER', label: 'Inkoko zitera amagi (12 months)' },
  { value: 'MEAT', label: 'Inkoko y\'inyama (12 weeks)' },
] as const;

export const LIVESTOCK_APPLICATION_DRAFT_KEY = 'ezinsure:livestock-application-draft';
export const LIVESTOCK_APPLICATION_INTAKE_KEY = 'ezinsure:livestock-application-intake';
