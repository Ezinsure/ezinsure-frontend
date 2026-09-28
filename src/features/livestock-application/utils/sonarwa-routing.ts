import type {
  InsuredLinePayload,
  LivestockApplicationPackage,
  LivestockSpeciesGroup,
} from '@/features/livestock-application/domain/application-types';

/**
 * SONARWA review is required for:
 * - Pigs and chickens (always)
 * - Cattle applications where at least one animal has no chip/eartag
 *
 * Cattle with chip numbers on every line skip SONARWA and go to Pending Admin Review.
 */
export function lineHasChipCode(line: InsuredLinePayload): boolean {
  return Boolean(line.animal?.chipNumber?.trim() || line.tekanaEligible);
}

export function applicationRequiresSonarwaReview(
  application: Pick<LivestockApplicationPackage, 'speciesGroup' | 'lines'>,
): boolean {
  const group = application.speciesGroup;
  if (group === 'POULTRY' || group === 'PIG') return true;

  const lines = application.lines ?? [];
  if (lines.length === 0) return false;
  return lines.some((line) => !lineHasChipCode(line));
}

export function sonarwaRoutingReason(speciesGroup: LivestockSpeciesGroup, requires: boolean): string {
  if (!requires) {
    return 'All cattle have chip/eartag codes — SONARWA review is skipped. Application proceeds to Pending Admin Review after insurance is issued.';
  }
  if (speciesGroup === 'POULTRY') {
    return 'Poultry applications always require SONARWA review.';
  }
  if (speciesGroup === 'PIG') {
    return 'Pig applications always require SONARWA review.';
  }
  return 'One or more cattle lack a chip/eartag code — the whole application requires SONARWA review.';
}
