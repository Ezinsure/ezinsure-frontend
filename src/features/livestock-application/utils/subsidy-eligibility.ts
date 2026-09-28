import type {
  InsuredLinePayload,
  LivestockApplicationPackage,
  LivestockSpeciesGroup,
} from '@/features/livestock-application/domain/application-types';

export interface SubsidyEligibilityResult {
  required: boolean;
  reason: string;
  /** Animals that must appear on the sector nkunganire document. */
  animalsRequiringSector: number;
  totalAnimals: number;
  /** Lines missing Tekana chip / not Tekana-eligible (cattle only). */
  linesMissingTekana: InsuredLinePayload[];
}

function lineQuantity(line: InsuredLinePayload): number {
  return Math.max(1, line.quantity ?? 1);
}

function lineNeedsSectorSignature(
  speciesGroup: LivestockSpeciesGroup,
  line: InsuredLinePayload,
): boolean {
  if (speciesGroup === 'POULTRY' || speciesGroup === 'PIG') {
    return true;
  }
  const chip = line.animal?.chipNumber?.trim();
  const tekana = line.tekanaEligible || Boolean(chip);
  return !tekana;
}

/** Business rules for nkunganire / sector signature requirement. */
export function resolveSubsidyEligibility(
  application: Pick<LivestockApplicationPackage, 'speciesGroup' | 'lines' | 'subsidyCase'>,
): SubsidyEligibilityResult {
  const lines = application.lines ?? [];
  const totalAnimals = lines.reduce((sum, line) => sum + lineQuantity(line), 0);
  const linesMissingTekana = lines.filter((line) =>
    lineNeedsSectorSignature(application.speciesGroup, line),
  );
  const animalsRequiringSector = linesMissingTekana.reduce(
    (sum, line) => sum + lineQuantity(line),
    0,
  );

  if (application.speciesGroup === 'POULTRY') {
    return {
      required: true,
      reason:
        'Poultry is not registered on Tekana — a sector-signed nkunganire document is always required.',
      animalsRequiringSector: totalAnimals || animalsRequiringSector,
      totalAnimals,
      linesMissingTekana: lines,
    };
  }

  if (application.speciesGroup === 'PIG') {
    return {
      required: true,
      reason:
        'Pigs are not on Tekana — a sector-signed nkunganire document is always required.',
      animalsRequiringSector: totalAnimals || animalsRequiringSector,
      totalAnimals,
      linesMissingTekana: lines,
    };
  }

  if (animalsRequiringSector > 0) {
    return {
      required: true,
      reason:
        'One or more cattle lack a Tekana chip code — those animals need sector approval on the nkunganire form.',
      animalsRequiringSector,
      totalAnimals,
      linesMissingTekana,
    };
  }

  if (lines.length === 0 && application.subsidyCase?.required) {
    return {
      required: true,
      reason: 'Subsidy workflow flagged by the server — sector document may be required.',
      animalsRequiringSector: 0,
      totalAnimals: 0,
      linesMissingTekana: [],
    };
  }

  return {
    required: false,
    reason:
      'All cattle have Tekana chip codes — sector nkunganire is not required. Application proceeds to Pending Admin Review after insurance is issued (SONARWA review is skipped).',
    animalsRequiringSector: 0,
    totalAnimals,
    linesMissingTekana: [],
  };
}
