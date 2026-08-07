/**
 * Livestock application form — internal field names align with VeterinaryApplication / Tekana import
 * where possible. Extension fields are marked for future API mapping.
 */

import type {
  LivestockOwnerMode,
  LivestockSpeciesGroup,
  PoultryProductType,
} from '@/features/livestock-application/domain/application-types';

export type { LivestockOwnerMode, LivestockSpeciesGroup, PoultryProductType };

export type LivestockApplicationFormMode = 'create' | 'edit' | 'review' | 'readonly';

export type LivestockApplicationStepId =
  | 'insurancePeriod'
  | 'applicantInfo'
  | 'applicantAddress'
  | 'livestockLocation'
  | 'livestockDetails'
  | 'veterinarySupport'
  | 'diseaseInfo'
  | 'bankLoan'
  | 'premiumInfo'
  | 'veterinaryVerification'
  | 'review';

/** Single animal row — maps to API: chipNumber, species, breed, sex, animalType, sumAssured, etc. */
export interface LivestockAnimalRow {
  id: string;
  animalType: string;
  /** UI category (Imbyeyi / Imfizi); maps to API `sex` when submitted */
  animalCategory: string;
  animalAge: string;
  /** Eartag — API field: chipNumber */
  chipNumber: string;
  breed: string;
  color: string;
  productivity: string;
  /** Insured value — API field: sumAssured */
  sumAssured: string;
  /** Multi-owner mode — per-row owner details */
  ownerName?: string;
  ownerPhone?: string;
  ownerNationalId?: string;
  /** Per-row gender for multi-owner — API: owner.gender */
  ownerGender?: '' | 'male' | 'female';
  /** Vaccination / inoculation records — API: vaccinationInfo */
  vaccinationInfo?: string;
  /** Poultry lot mode */
  quantity?: string;
  unitValue?: string;
  hatcherySource?: string;
  poultryProductType?: PoultryProductType | '';
}

export interface LivestockApplicationIntakeConfig {
  speciesGroup: LivestockSpeciesGroup;
  ownerMode: LivestockOwnerMode;
}

export interface LivestockApplicationFormValues {
  // Section 1 — Insurance period (API: policyStartDate, policyEndDate)
  policyStartDate: string;
  policyEndDate: string;
  farmingExperience: string;
  previousIncidents: string;

  // Section 2 — Applicant (API: ownerName, ownerPhone, insuranceType)
  ownerName: string;
  isFirstApplication: boolean;
  isRenewal: boolean;
  nationalId: string;
  /** API: gender — male | female */
  ownerGender: '' | 'male' | 'female';
  ownerPhone: string;
  /** Cattle only — API: girinka — yes | no */
  girinka: '' | 'yes' | 'no';

  // Section 3 — Applicant address (extension: province; API location uses district/sector/cell/village)
  applicantProvince: string;
  applicantDistrict: string;
  applicantSector: string;
  applicantCell: string;
  applicantVillage: string;

  // Section 4 — Livestock location (API: district, sector, cell, village)
  livestockProvince: string;
  district: string;
  sector: string;
  cell: string;
  village: string;

  // Section 5 — Livestock items
  livestockItems: LivestockAnimalRow[];

  // Section 6 — Veterinary support (application-only until API)
  hasVeterinarian: string;
  veterinarianAvailability: string;

  // Section 7 — Disease (application-only)
  knownDiseases: string;

  // Section 8 — Bank / loan (application-only)
  hasLoan: string;
  financialInstitutionName: string;
  institutionLocation: string;
  loanAccountNumber: string;
  loanAmount: string;

  // Section 9 — Premium
  /** Rate % applied to total sum assured (e.g. 5.5) */
  premiumPercentage: string;
  /** Total premium RWF — 100% (API: premiumRate) */
  premiumRateAmount: string;
  /** API: farmerContribution — 60% of premiumRateAmount */
  farmerContributionAmount: string;
  /** API: governmentContribution — 40% of premiumRateAmount */
  governmentContribution: string;
  /** API: companyCommission — 8% of premiumRateAmount */
  companyCommission: string;
  /** API: veterinaryCommission — 5% of premiumRateAmount */
  veterinaryCommission: string;

  // Section 10 — Verification (application-only)
  insuranceAgentCode: string;
  veterinarianLicenseNumber: string;
  veterinarianSignatureName: string;
}

export interface LivestockApplicationDraftMeta {
  savedAt: string;
  stepId: LivestockApplicationStepId;
}

/** @deprecated Use LivestockAnimalRow */
export type LivestockProposalItem = LivestockAnimalRow;
/** @deprecated Use LivestockApplicationFormValues */
export type LivestockProposalFormValues = LivestockApplicationFormValues;
