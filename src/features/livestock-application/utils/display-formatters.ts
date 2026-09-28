export type OwnerGender = 'male' | 'female';

export type GirinkaValue = 'yes' | 'no';

const GENDER_LABELS: Record<OwnerGender, string> = {
  male: 'GABO',
  female: 'GORE',
};

export function formatOwnerGenderDisplay(
  gender?: OwnerGender | string | null,
  emptyLabel = '—',
): string {
  if (!gender) return emptyLabel;
  const normalized = String(gender).toLowerCase();
  if (normalized === 'male') return GENDER_LABELS.male;
  if (normalized === 'female') return GENDER_LABELS.female;
  return emptyLabel;
}

export function formatGirinkaDisplay(
  value?: GirinkaValue | string | null,
  emptyLabel = '—',
): string {
  if (!value) return emptyLabel;
  const normalized = String(value).toLowerCase();
  if (normalized === 'yes') return 'Yego';
  if (normalized === 'no') return 'Oya';
  return emptyLabel;
}
