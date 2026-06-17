import type { InsuredLinePayload } from '@/features/livestock-application/domain/application-types';

export function pickDefinedStrings(
  fields: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v != null && String(v).trim() !== ''),
  ) as Record<string, string>;
}

export function buildOwnerSummary(o: Record<string, unknown>, lines: unknown[]): string {
  const uniqueOwners = new Set(
    lines
      .map((line) => {
        const l = line as Record<string, unknown>;
        const owner = l.owner as { name?: string } | undefined;
        return String(l.ownerName ?? owner?.name ?? '').trim();
      })
      .filter(Boolean),
  );

  if (o.ownerMode === 'MULTI_OWNER' && uniqueOwners.size > 1) {
    return `${uniqueOwners.size} owners`;
  }

  return String(o.ownerSummary ?? o.ownerName ?? '—');
}

export function mapApiLineRecord(line: Record<string, unknown>): InsuredLinePayload {
  const animal = (line.animal as Record<string, unknown> | undefined) ?? line;
  const owner = line.owner as { name?: string; phone?: string } | undefined;
  const ownerName = String(line.ownerName ?? owner?.name ?? '').trim();
  const ownerPhone = String(line.ownerPhone ?? owner?.phone ?? '').trim();

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
    ...(ownerName || ownerPhone ? { owner: { name: ownerName, phone: ownerPhone } } : {}),
    animal: {
      species: str(animal.species ?? line.species) ?? '',
      animalCategory: str(animal.animalCategory ?? line.animalCategory),
      animalAge: str(animal.animalAge ?? line.animalAge),
      chipNumber: str(animal.chipNumber ?? line.chipNumber),
      breed: str(animal.breed ?? line.breed),
      color: str(animal.color ?? line.color),
      productivity: str(animal.productivity ?? line.productivity),
      hatcherySource: str(animal.hatcherySource ?? line.hatcherySource),
      poultryProductType: str(animal.poultryProductType ?? line.poultryProductType) as
        | InsuredLinePayload['animal']['poultryProductType']
        | undefined,
    },
    tekanaEligible: Boolean(line.tekanaEligible),
  };
}
