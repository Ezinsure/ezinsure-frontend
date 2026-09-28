import type {
  LivestockApplicationListItem,
  LivestockApplicationStatus,
  LivestockSpeciesGroup,
} from '@/features/livestock-application/domain/application-types';
import { APPLICATION_STATUS_LABELS } from '@/features/livestock-application/domain/application-status';
import type { VeterinaryApplication } from '@/features/vet-portal/types';

export function isLivestockApplicationStatus(value: string): value is LivestockApplicationStatus {
  return value in APPLICATION_STATUS_LABELS;
}

export function isLivestockPackageListItem(item: unknown): item is LivestockApplicationListItem {
  if (typeof item !== 'object' || item === null) return false;
  const o = item as Record<string, unknown>;
  if (typeof o.speciesGroup !== 'string' || typeof o.lineCount !== 'number') return false;

  // Must already be UI-normalized. Flat API rows (e.g. SONARWA list) also expose
  // speciesGroup + lineCount but keep amounts at the top level without `totals`.
  const totals = o.totals;
  return (
    typeof totals === 'object' &&
    totals !== null &&
    typeof (totals as { farmerContributionAmount?: unknown }).farmerContributionAmount === 'number'
  );
}

/** GET /getVeterinaryApplications — package documents (speciesGroup + lines[]). */
export function isNewApiApplicationRecord(o: Record<string, unknown>): boolean {
  return (
    typeof o._id === 'string' &&
    typeof o.applicationNumber === 'string' &&
    typeof o.speciesGroup === 'string' &&
    Array.isArray(o.lines)
  );
}

export function isLegacyFlatVeterinaryApplication(o: Record<string, unknown>): boolean {
  return (
    typeof o._id === 'string' &&
    typeof o.applicationNumber === 'string' &&
    !Array.isArray(o.lines) &&
    (o.chipNumber != null || o.animalType != null || o.sumAssured != null)
  );
}

export function extractApplicationsRawRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray((payload as { data?: unknown[] })?.data)) {
    return (payload as { data: unknown[] }).data;
  }
  return [];
}

export function inferSpeciesGroup(animalType?: string, species?: string): LivestockSpeciesGroup {
  const s = `${species ?? ''} ${animalType ?? ''}`.toLowerCase();
  if (s.includes('inkoko') || s.includes('poultry') || s.includes('chicken') || s.includes('layer')) {
    return 'POULTRY';
  }
  if (s.includes('ingurube') || s.includes('pig')) {
    return 'PIG';
  }
  return 'CATTLE';
}

export function isLegacyVeterinaryApplication(item: unknown): item is VeterinaryApplication {
  if (!item || typeof item !== 'object') return false;
  return isLegacyFlatVeterinaryApplication(item as Record<string, unknown>);
}
