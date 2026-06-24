import type { InsuredLinePayload } from '@/features/livestock-application/domain/application-types';
import {
  resolveOwnerSummaryFromRecord,
  resolvePackageOwnersList,
  resolvePackagePrimaryOwner,
} from '@/features/livestock-application/api/mappers/owners.mapper';

export function pickDefinedStrings(
  fields: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v != null && String(v).trim() !== ''),
  ) as Record<string, string>;
}

export function buildOwnerSummary(o: Record<string, unknown>, lines: unknown[]): string {
  const animalLines = Array.isArray(o.animals) && o.animals.length > 0 ? o.animals : lines;
  const lookup = new Map<string, string>();

  for (const owner of resolvePackageOwnersList(o)) {
    if (owner.id) lookup.set(owner.id, owner.name);
  }

  const primary = resolvePackagePrimaryOwner(o);
  if (primary?.id) lookup.set(primary.id, primary.name);

  const uniqueOwners = new Set(
    animalLines
      .map((line) => {
        const l = line as Record<string, unknown>;
        const owner = l.owner as { name?: string } | undefined;
        const ownerId = String(l.ownerId ?? '').trim();
        return String(l.ownerName ?? owner?.name ?? (ownerId ? lookup.get(ownerId) : '') ?? '').trim();
      })
      .filter(Boolean),
  );

  if (uniqueOwners.size > 1) {
    return `${uniqueOwners.size} owners`;
  }

  if (uniqueOwners.size === 1) {
    return Array.from(uniqueOwners)[0];
  }

  return resolveOwnerSummaryFromRecord(o, '—');
}

export function mapApiLineRecord(line: Record<string, unknown>): InsuredLinePayload {
  const animal = (line.animal as Record<string, unknown> | undefined) ?? line;
  const owner = line.owner as {
    name?: string;
    phone?: string;
    nationalId?: string;
    gender?: 'male' | 'female';
  } | undefined;
  const ownerName = String(line.ownerName ?? owner?.name ?? '').trim();
  const ownerPhone = String(line.ownerPhone ?? owner?.phone ?? '').trim();
  const ownerNationalId = String(
    line.ownerNationalId ?? owner?.nationalId ?? '',
  ).trim();
  const ownerGenderRaw = owner?.gender ?? line.ownerGender;
  const ownerGender =
    ownerGenderRaw === 'male' || ownerGenderRaw === 'female' ? ownerGenderRaw : undefined;

  const str = (value: unknown) => {
    const s = String(value ?? '').trim();
    return s || undefined;
  };

  return {
    lineType: (line.lineType as InsuredLinePayload['lineType']) ?? 'INDIVIDUAL',
    quantity: Number(line.quantity ?? 1),
    unitValue: Number(line.unitValue ?? 0),
    sumAssured: Number(line.sumAssured ?? 0),
    premiumRate: Number(line.premiumRate ?? 0),
    farmerContribution: Number(line.farmerContribution ?? 0),
    governmentContribution: Number(line.governmentContribution ?? 0),
    ...(ownerName || ownerPhone || ownerNationalId || ownerGender
      ? {
          owner: {
            name: ownerName,
            phone: ownerPhone,
            ...(ownerNationalId ? { nationalId: ownerNationalId } : {}),
            ...(ownerGender ? { gender: ownerGender } : {}),
          },
        }
      : {}),
    animal: {
      species: str(animal.species ?? line.species) ?? '',
      animalCategory: str(animal.animalCategory ?? line.animalCategory),
      animalAge: str(animal.animalAge ?? line.animalAge),
      chipNumber: str(animal.chipNumber ?? line.chipNumber),
      breed: str(animal.breed ?? line.breed),
      color: str(animal.color ?? line.color),
      productivity: str(animal.productivity ?? line.productivity),
      hatcherySource: str(animal.hatcherySource ?? line.hatcherySource),
      vaccinationInfo: str(animal.vaccinationInfo ?? line.vaccinationInfo),
      poultryProductType: str(animal.poultryProductType ?? line.poultryProductType) as
        | InsuredLinePayload['animal']['poultryProductType']
        | undefined,
    },
    tekanaEligible: Boolean(line.tekanaEligible),
  };
}
