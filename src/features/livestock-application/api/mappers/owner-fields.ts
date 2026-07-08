export interface NormalizedOwnerFields {
  id?: string;
  name: string;
  phone: string;
  nationalId?: string;
  gender?: 'male' | 'female';
}

function str(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}

export function parseOwnerGender(value: unknown): 'male' | 'female' | undefined {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'male') return 'male';
  if (normalized === 'female') return 'female';
  return undefined;
}

export function normalizeOwnerRecord(owner: Record<string, unknown>): NormalizedOwnerFields | null {
  const name = str(owner.name);
  if (!name) return null;

  return {
    id: str(owner._id ?? owner.id),
    name,
    phone: str(owner.phone) ?? '',
    nationalId: str(owner.ownerNationalId ?? owner.nationalId),
    gender: parseOwnerGender(owner.ownerGender ?? owner.gender),
  };
}
