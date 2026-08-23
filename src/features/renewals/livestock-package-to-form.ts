import type { LivestockApplicationPackage } from '@/features/livestock-application/domain/application-types';
import { createLivestockItemId } from '@/features/livestock-application/initial-state';
import type {
  LivestockAnimalRow,
  LivestockApplicationFormValues,
} from '@/features/livestock-application/types';
import { toLocalRwandaPhone } from '@/features/livestock-application/utils/phone';
import { nextPolicyPeriod, isoDateOnly } from '@/features/renewals/date-utils';

function str(value: unknown): string {
  return value == null ? '' : String(value);
}

function mapLine(line: LivestockApplicationPackage['lines'][number]): LivestockAnimalRow {
  const animal = line.animal ?? ({} as LivestockApplicationPackage['lines'][number]['animal']);
  const owner = line.owner;
  return {
    id: createLivestockItemId(),
    animalType: str(animal.species),
    animalCategory: str(animal.animalCategory),
    animalAge: str(animal.animalAge),
    chipNumber: str(animal.chipNumber),
    breed: str(animal.breed),
    color: str(animal.color),
    productivity: str(animal.productivity),
    sumAssured: line.sumAssured != null ? String(line.sumAssured) : '',
    ownerName: owner?.name ?? '',
    ownerPhone: owner?.phone ? toLocalRwandaPhone(owner.phone) : '',
    ownerNationalId: owner?.nationalId ?? '',
    ownerGender: owner?.gender === 'male' || owner?.gender === 'female' ? owner.gender : '',
    vaccinationInfo: animal.vaccinationInfo ?? '',
    quantity: line.quantity != null ? String(line.quantity) : '',
    unitValue: line.unitValue != null ? String(line.unitValue) : '',
    hatcherySource: animal.hatcherySource ?? '',
    poultryProductType: animal.poultryProductType ?? '',
  };
}

export function livestockPackageToRenewalFormValues(
  pkg: LivestockApplicationPackage,
): Partial<LivestockApplicationFormValues> {
  const period = nextPolicyPeriod(pkg.policyEndDate);
  const owner = pkg.primaryOwner;
  const applicant = pkg.applicantAddress;
  const location = pkg.livestockLocation;
  const totals = pkg.totals;

  return {
    policyStartDate: period.start,
    policyEndDate: period.end,
    farmingExperience: str(pkg.farmingExperience),
    previousIncidents: str(pkg.previousIncidents),
    ownerName: owner?.name ?? pkg.ownerSummary ?? '',
    isFirstApplication: false,
    isRenewal: true,
    nationalId: str(pkg.nationalId ?? owner?.nationalId),
    ownerGender:
      pkg.ownerGender === 'male' || pkg.ownerGender === 'female'
        ? pkg.ownerGender
        : owner?.gender === 'male' || owner?.gender === 'female'
          ? owner.gender
          : '',
    ownerPhone: owner?.phone ? toLocalRwandaPhone(owner.phone) : '',
    girinka: pkg.girinka === 'yes' || pkg.girinka === 'no' ? pkg.girinka : '',
    applicantProvince: str(applicant?.province),
    applicantDistrict: str(applicant?.district),
    applicantSector: str(applicant?.sector),
    applicantCell: str(applicant?.cell),
    applicantVillage: str(applicant?.village),
    livestockProvince: str(location?.province),
    district: str(location?.district),
    sector: str(location?.sector),
    cell: str(location?.cell),
    village: str(location?.village),
    livestockItems: pkg.lines?.length ? pkg.lines.map(mapLine) : undefined,
    hasVeterinarian: str(pkg.hasVeterinarian),
    veterinarianAvailability: str(pkg.veterinarianAvailability),
    knownDiseases: str(pkg.knownDiseases),
    hasLoan: str(pkg.hasLoan),
    financialInstitutionName: str(pkg.financialInstitutionName),
    institutionLocation: str(pkg.institutionLocation),
    loanAccountNumber: str(pkg.loanAccountNumber),
    loanAmount: str(pkg.loanAmount),
    premiumPercentage: totals?.premiumPercentage != null ? String(totals.premiumPercentage) : '',
    premiumRateAmount: totals?.premiumRateAmount != null ? String(totals.premiumRateAmount) : '',
    farmerContributionAmount:
      totals?.farmerContributionAmount != null ? String(totals.farmerContributionAmount) : '',
    governmentContribution:
      totals?.governmentContribution != null ? String(totals.governmentContribution) : '',
    companyCommissionRate:
      totals?.companyCommissionRate != null
        ? String(totals.companyCommissionRate)
        : '8',
    companyCommission: totals?.companyCommission != null ? String(totals.companyCommission) : '',
    veterinaryCommission:
      totals?.veterinaryCommission != null ? String(totals.veterinaryCommission) : '',
    insuranceAgentCode: str(pkg.insuranceAgentCode),
    veterinarianLicenseNumber: str(pkg.veterinarianLicenseNumber),
    veterinarianSignatureName: str(pkg.veterinarianSignatureName),
  };
}

export function originalPolicyEndLabel(pkg: LivestockApplicationPackage): string {
  return isoDateOnly(pkg.policyEndDate);
}
