import type {
  InsuredLinePayload,
  LivestockApplicationPackage,
  LivestockOwnerMode,
} from '@/features/livestock-application/domain/application-types';
import { LIVESTOCK_FORM_LABELS } from '@/features/livestock-application/labels';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { formatOwnerGenderDisplay } from '@/features/livestock-application/utils/display-formatters';

export interface AggregatedOwner {
  key: string;
  name: string;
  phone?: string;
  nationalId?: string;
  gender?: 'male' | 'female';
  address?: string;
  lineCount: number;
  totalSumAssured: number;
}

function ownerMatchesLine(
  owner: { id?: string; name: string; phone: string },
  line: InsuredLinePayload,
): boolean {
  const linePhone = line.owner?.phone?.trim();
  const lineName = line.owner?.name?.trim();
  if (owner.phone && linePhone && owner.phone === linePhone) return true;
  if (owner.name && lineName && owner.name === lineName) return true;
  return false;
}

export function aggregateOwnersFromPackage(
  application: LivestockApplicationPackage,
): AggregatedOwner[] {
  const fromLines = aggregateOwnersFromLines(
    application.lines,
    application.ownerMode,
    application.ownerSummary,
  );

  const hasLineBackedOwners = fromLines.some((owner) => owner.lineCount > 0);
  if (hasLineBackedOwners) {
    if (
      fromLines.length === 1 &&
      fromLines[0].lineCount === 0 &&
      application.totals.totalSumAssured > 0
    ) {
      return [{ ...fromLines[0], totalSumAssured: application.totals.totalSumAssured }];
    }
    return fromLines;
  }

  if (application.ownerMode === 'MULTI_OWNER' && application.ownersList?.length) {
    return application.ownersList.map((owner) => {
      const matchingLines = application.lines.filter((line) => ownerMatchesLine(owner, line));
      return {
        key: owner.id || owner.phone || owner.name,
        name: owner.name,
        phone: owner.phone,
        nationalId: owner.nationalId,
        gender: owner.gender,
        lineCount:
          matchingLines.length > 0
            ? matchingLines.reduce(
                (count, line) => count + (line.lineType === 'LOT' ? 1 : line.quantity),
                0,
              )
            : 0,
        totalSumAssured: matchingLines.reduce((sum, line) => sum + line.sumAssured, 0),
      };
    });
  }

  if (
    application.ownerMode === 'SINGLE_OWNER' &&
    fromLines.length === 0 &&
    (application.primaryOwner?.name || application.ownerSummary)
  ) {
    return [
      {
        key: 'primary',
        name: application.primaryOwner?.name || application.ownerSummary,
        phone: application.primaryOwner?.phone,
        lineCount: application.lineCount,
        totalSumAssured: application.totals.totalSumAssured,
      },
    ];
  }

  return fromLines;
}

export function ownerLineKey(line: InsuredLinePayload): string {
  return (
    line.owner?.id?.trim() ||
    line.owner?.phone?.trim() ||
    line.owner?.name?.trim() ||
    'unknown'
  );
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
    const key = ownerLineKey(line);
    const existing = map.get(key);
    if (existing) {
      existing.lineCount += line.lineType === 'LOT' ? 1 : line.quantity;
      existing.totalSumAssured += line.sumAssured;
    } else {
      map.set(key, {
        key,
        name,
        phone,
        nationalId: line.owner?.nationalId,
        gender: line.owner?.gender,
        lineCount: line.lineType === 'LOT' ? 1 : line.quantity,
        totalSumAssured: line.sumAssured,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Unified, professional label for the animal identifier column.
 * Covers cattle/pig chip & eartag numbers and poultry lot numbers so the
 * heading is consistent everywhere an insured line is displayed.
 */
export const INSURED_LINE_IDENTIFIER_LABEL = 'Chip / eartag / lot';

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
  if (line.owner?.nationalId) {
    fields.push({
      label: LIVESTOCK_FORM_LABELS.fields.ownerNationalId,
      value: line.owner.nationalId,
    });
  }
  if (line.owner?.gender) {
    fields.push({
      label: LIVESTOCK_FORM_LABELS.fields.ownerGender,
      value: formatOwnerGenderDisplay(line.owner.gender),
    });
  }
  fields.push({ label: 'Species', value: line.animal.species });
  if (line.animal.chipNumber) {
    fields.push({ label: INSURED_LINE_IDENTIFIER_LABEL, value: line.animal.chipNumber });
  }
  if (line.animal.hatcherySource) fields.push({ label: 'Hatchery source', value: line.animal.hatcherySource });
  if (line.animal.poultryProductType) {
    fields.push({
      label: 'Product type',
      value: line.animal.poultryProductType === 'EGG_LAYER' ? 'Egg layer (12 months)' : 'Meat (12 weeks)',
    });
  }
  if (line.animal.breed) fields.push({ label: 'Breed', value: line.animal.breed });
  if (line.animal.animalCategory) fields.push({ label: 'Category', value: line.animal.animalCategory });
  if (line.animal.animalAge) {
    fields.push({ label: LIVESTOCK_FORM_LABELS.fields.animalAge, value: line.animal.animalAge });
  }
  if (line.animal.color) fields.push({ label: 'Color', value: line.animal.color });
  if (line.animal.productivity) fields.push({ label: 'Productivity', value: line.animal.productivity });
  if (line.animal.vaccinationInfo) {
    fields.push({
      label: LIVESTOCK_FORM_LABELS.fields.vaccinationInfo,
      value: line.animal.vaccinationInfo,
    });
  }
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
  return lines.filter((line) => ownerLineKey(line) === ownerKey);
}

export function isPoultryApplication(application: LivestockApplicationPackage): boolean {
  return application.speciesGroup === 'POULTRY';
}
