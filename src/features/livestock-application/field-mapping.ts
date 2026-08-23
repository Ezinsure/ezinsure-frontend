/**
 * Maps livestock application form fields to existing Tekana import keys and VeterinaryApplication API fields.
 * Use this when wiring submit APIs — avoid duplicate names.
 */

export const APPLICATION_TO_TEKANA_IMPORT_KEY = {
  chipNumber: 'chip',
  sumAssured: 'sumAssured',
  farmerContributionAmount: 'farmerContribution',
  premiumRateAmount: 'premiumRate',
  governmentContribution: 'governmentContribution',
  companyCommission: 'companyCommission',
  companyCommissionRate: 'companyCommissionRate',
  veterinaryCommission: 'veterinaryCommission',
  ownerName: 'ownerName',
  ownerPhone: 'ownerPhone',
  ownerDateOfBirth: 'ownerDateOfBirth',
  policyStartDate: 'policyInsuranceDate',
  policyEndDate: 'policyEndDate',
  district: 'district',
  sector: 'sector',
  cell: 'cell',
  village: 'village',
  animalType: 'animalType',
  species: 'species',
  breed: 'breed',
  sex: 'sex',
} as const;

/** Application-only fields (not in mass upload / API yet) */
export const APPLICATION_EXTENSION_FIELDS = [
  'farmingExperience',
  'previousIncidents',
  'nationalId',
  'applicantProvince',
  'applicantDistrict',
  'applicantSector',
  'applicantCell',
  'applicantVillage',
  'livestockProvince',
  'animalCategory',
  'color',
  'productivity',
  'hasVeterinarian',
  'veterinarianAvailability',
  'knownDiseases',
  'hasLoan',
  'financialInstitutionName',
  'institutionLocation',
  'loanAccountNumber',
  'loanAmount',
  'premiumPercentage',
  'insuranceAgentCode',
  'veterinarianLicenseNumber',
  'veterinarianSignatureName',
] as const;
