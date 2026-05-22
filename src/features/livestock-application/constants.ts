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
  'color',
  'productivity',
  'sumAssured',
] as const;

export const LIVESTOCK_APPLICATION_DRAFT_KEY = 'ezinsure:livestock-application-draft';
