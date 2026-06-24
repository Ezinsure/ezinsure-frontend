import type { LivestockApplicationFormValues, LivestockAnimalRow } from '@/features/livestock-application/types';

export function createLivestockItemId(): string {
  return `ls-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isLivestockRowEmpty(row: LivestockAnimalRow): boolean {
  return (
    !row.animalType.trim() &&
    !row.animalCategory.trim() &&
    !row.animalAge.trim() &&
    !row.chipNumber.trim() &&
    !row.breed.trim() &&
    !row.vaccinationInfo?.trim() &&
    !row.color.trim() &&
    !row.productivity.trim() &&
    !row.sumAssured.trim()
  );
}

export function mergeImportedLivestockItems(
  existing: LivestockAnimalRow[],
  imported: LivestockAnimalRow[],
): LivestockAnimalRow[] {
  const kept = existing.filter((row) => !isLivestockRowEmpty(row));
  return imported.length > 0 ? [...kept, ...imported] : kept.length > 0 ? kept : [createEmptyLivestockItem()];
}

export function createEmptyLivestockItem(): LivestockAnimalRow {
  return {
    id: createLivestockItemId(),
    animalType: '',
    animalCategory: '',
    animalAge: '',
    chipNumber: '',
    breed: '',
    vaccinationInfo: '',
    color: '',
    productivity: '',
    sumAssured: '',
  };
}

export function createInitialLivestockApplicationValues(): LivestockApplicationFormValues {
  return {
    policyStartDate: '',
    policyEndDate: '',
    farmingExperience: '',
    previousIncidents: '',
    ownerName: '',
    isFirstApplication: false,
    isRenewal: false,
    nationalId: '',
    ownerGender: '',
    ownerPhone: '',
    girinka: '',
    applicantProvince: '',
    applicantDistrict: '',
    applicantSector: '',
    applicantCell: '',
    applicantVillage: '',
    livestockProvince: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    livestockItems: [createEmptyLivestockItem()],
    hasVeterinarian: '',
    veterinarianAvailability: '',
    knownDiseases: '',
    hasLoan: '',
    financialInstitutionName: '',
    institutionLocation: '',
    loanAccountNumber: '',
    loanAmount: '',
    premiumPercentage: '',
    premiumRateAmount: '',
    farmerContributionAmount: '',
    governmentContribution: '',
    companyCommission: '',
    veterinaryCommission: '',
    insuranceAgentCode: '',
    veterinarianLicenseNumber: '',
    veterinarianSignatureName: '',
  };
}
