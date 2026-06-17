import type { LivestockApplicationStepId } from '@/features/livestock-application/types';
import type { LivestockOwnerMode, LivestockSpeciesGroup } from '@/features/livestock-application/domain/application-types';

export type FormProfileId =
  | 'SINGLE_OWNER_CATTLE'
  | 'SINGLE_OWNER_PIG'
  | 'SINGLE_OWNER_POULTRY'
  | 'MULTI_OWNER';

export interface ApplicationIntakeSelection {
  speciesGroup: LivestockSpeciesGroup;
  ownerMode: LivestockOwnerMode;
}

export interface FormProfile {
  id: FormProfileId;
  title: string;
  description: string;
  stepIds: LivestockApplicationStepId[];
  lineTableVariant: 'INDIVIDUAL' | 'POULTRY_LOT' | 'MULTI_OWNER';
  /** All animal rows use this type — matches intake species selection */
  lockedAnimalType: string;
}

const BASE_TAIL: LivestockApplicationStepId[] = [
  'veterinarySupport',
  'diseaseInfo',
  'bankLoan',
  'premiumInfo',
  'veterinaryVerification',
  'review',
];

const SINGLE_OWNER_HEAD: LivestockApplicationStepId[] = [
  'insurancePeriod',
  'applicantInfo',
  'applicantAddress',
  'livestockLocation',
  'livestockDetails',
];

const MULTI_OWNER_HEAD: LivestockApplicationStepId[] = [
  'insurancePeriod',
  'livestockLocation',
  'livestockDetails',
];

export function resolveFormProfile(intake: ApplicationIntakeSelection): FormProfile {
  const lockedAnimalType = speciesGroupToAnimalType(intake.speciesGroup);

  if (intake.ownerMode === 'MULTI_OWNER') {
    return {
      id: 'MULTI_OWNER',
      title: 'Multi-owner application',
      description: 'Several farmers in one package — owner details on each animal row.',
      stepIds: [...MULTI_OWNER_HEAD, ...BASE_TAIL],
      lineTableVariant: 'MULTI_OWNER',
      lockedAnimalType,
    };
  }

  if (intake.speciesGroup === 'POULTRY') {
    return {
      id: 'SINGLE_OWNER_POULTRY',
      title: 'Poultry application (single owner)',
      description: 'Lots with quantity, hatchery source, and auto premium at 5.5%.',
      stepIds: [...SINGLE_OWNER_HEAD, ...BASE_TAIL],
      lineTableVariant: 'POULTRY_LOT',
      lockedAnimalType,
    };
  }

  if (intake.speciesGroup === 'PIG') {
    return {
      id: 'SINGLE_OWNER_PIG',
      title: 'Pig application (single owner)',
      description: 'Individual animals under one owner.',
      stepIds: [...SINGLE_OWNER_HEAD, ...BASE_TAIL],
      lineTableVariant: 'INDIVIDUAL',
      lockedAnimalType,
    };
  }

  return {
    id: 'SINGLE_OWNER_CATTLE',
    title: 'Cattle application (single owner)',
    description: 'Individual cattle with chip/eartag under one owner.',
    stepIds: [...SINGLE_OWNER_HEAD, ...BASE_TAIL],
    lineTableVariant: 'INDIVIDUAL',
    lockedAnimalType,
  };
}

export function speciesGroupLabel(group: LivestockSpeciesGroup): string {
  const map: Record<LivestockSpeciesGroup, string> = {
    CATTLE: 'Inka (Cattle)',
    POULTRY: 'Inkoko (Poultry)',
    PIG: 'Ingurube (Pig)',
  };
  return map[group];
}

/** Kinyarwanda label used in livestock table rows and API `animal.species`. */
export function speciesGroupToAnimalType(group: LivestockSpeciesGroup): string {
  const map: Record<LivestockSpeciesGroup, string> = {
    CATTLE: 'Inka',
    POULTRY: 'Inkoko',
    PIG: 'Ingurube',
  };
  return map[group];
}

export function ownerModeLabel(mode: LivestockOwnerMode): string {
  return mode === 'SINGLE_OWNER' ? 'Same owner for all animals' : 'Different owners';
}
