import type {
  InsuredLinePayload,
  LivestockApplicationPackage,
  LivestockOwnerMode,
} from '@/features/livestock-application/domain/application-types';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';

export interface AggregatedOwner {
  key: string;
  name: string;
  phone?: string;
  lineCount: number;
  totalSumAssured: number;
}

export function aggregateOwnersFromLines(
  lines: InsuredLinePayload[],
  ownerMode: LivestockOwnerMode,
  ownerSummary: string,
): AggregatedOwner[] {
  if (ownerMode === 'SINGLE_OWNER') {
    return [
      {
        key: 'primary',
        name: ownerSummary,
        lineCount: lines.length,
        totalSumAssured:
          lines.length > 0
            ? lines.reduce((s, l) => s + l.sumAssured, 0)
            : 0,
      },
    ];
  }

  const map = new Map<string, AggregatedOwner>();
  for (const line of lines) {
    const name = line.owner?.name?.trim() || 'Unknown owner';
    const phone = line.owner?.phone?.trim();
    const key = phone || name;
    const existing = map.get(key);
    if (existing) {
      existing.lineCount += line.lineType === 'LOT' ? 1 : line.quantity;
      existing.totalSumAssured += line.sumAssured;
    } else {
      map.set(key, {
        key,
        name,
        phone,
        lineCount: line.lineType === 'LOT' ? 1 : line.quantity,
        totalSumAssured: line.sumAssured,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function lineTableLabel(line: InsuredLinePayload, index: number): string {
  if (line.lineType === 'LOT') {
    return line.animal.hatcherySource || `Lot ${index + 1}`;
  }
  return line.animal.chipNumber || `Line ${index + 1}`;
}

export function lineSecondaryLabel(line: InsuredLinePayload): string {
  if (line.lineType === 'LOT') {
    return `${line.quantity} birds · ${line.animal.poultryProductType === 'MEAT' ? 'Meat' : 'Egg layer'}`;
  }
  return [line.animal.breed, line.animal.animalCategory].filter(Boolean).join(' · ') || line.animal.species;
}

export function buildLineDetailFields(line: InsuredLinePayload): { label: string; value: string }[] {
  const isLot = line.lineType === 'LOT';
  const fields: { label: string; value: string }[] = [];

  fields.push({ label: 'Line type', value: isLot ? 'Lot (poultry)' : 'Individual animal' });
  if (line.owner?.name) fields.push({ label: 'Owner', value: line.owner.name });
  if (line.owner?.phone) fields.push({ label: 'Phone', value: line.owner.phone });
  fields.push({ label: 'Species', value: line.animal.species });
  if (line.animal.chipNumber) fields.push({ label: 'Eartag / lot ID', value: line.animal.chipNumber });
  if (line.animal.hatcherySource) fields.push({ label: 'Hatchery source', value: line.animal.hatcherySource });
  if (line.animal.poultryProductType) {
    fields.push({
      label: 'Product type',
      value: line.animal.poultryProductType === 'EGG_LAYER' ? 'Egg layer (12 months)' : 'Meat (12 weeks)',
    });
  }
  if (line.animal.breed) fields.push({ label: 'Breed', value: line.animal.breed });
  if (line.animal.animalCategory) fields.push({ label: 'Category', value: line.animal.animalCategory });
  if (line.animal.animalAge) fields.push({ label: 'Age (years)', value: line.animal.animalAge });
  if (line.animal.color) fields.push({ label: 'Color', value: line.animal.color });
  if (line.animal.productivity) fields.push({ label: 'Productivity', value: line.animal.productivity });
  if (isLot) {
    fields.push({ label: 'Quantity', value: String(line.quantity) });
    fields.push({ label: 'Unit value', value: formatRwfDisplay(line.unitValue) });
  }
  fields.push({ label: 'Sum assured', value: formatRwfDisplay(line.sumAssured) });
  fields.push({ label: 'Premium (100%)', value: formatRwfDisplay(line.premiumRate) });
  fields.push({ label: 'Farmer share (60%)', value: formatRwfDisplay(line.farmerContribution) });
  fields.push({ label: 'Nkunganire (40%)', value: formatRwfDisplay(line.governmentContribution) });
  fields.push({ label: 'Tekana eligible', value: line.tekanaEligible ? 'Yes' : 'No' });

  return fields;
}

export function filterLinesByOwner(
  lines: InsuredLinePayload[],
  ownerKey: string | null,
): InsuredLinePayload[] {
  if (!ownerKey) return lines;
  if (ownerKey === 'primary') return lines;
  return lines.filter((line) => {
    const key = line.owner?.phone?.trim() || line.owner?.name?.trim() || '';
    return key === ownerKey;
  });
}

export function isPoultryApplication(application: LivestockApplicationPackage): boolean {
  return application.speciesGroup === 'POULTRY';
}
