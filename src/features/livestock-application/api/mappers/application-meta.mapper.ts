import type { LivestockApplicationPackage } from '@/features/livestock-application/domain/application-types';

function str(value: unknown): string | undefined {
  const s = String(value ?? '').trim();
  return s || undefined;
}

function parseGirinka(value: unknown): 'yes' | 'no' | undefined {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'yes') return 'yes';
  if (normalized === 'no') return 'no';
  return undefined;
}

function parseGender(value: unknown): 'male' | 'female' | undefined {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'male') return 'male';
  if (normalized === 'female') return 'female';
  return undefined;
}

/** Map optional application-level fields from API records into the detail package. */
export function mapApplicationExtensionFields(
  record: Record<string, unknown>,
): Partial<LivestockApplicationPackage> {
  const owner = record.owner as { gender?: string; nationalId?: string } | undefined;
  const veterinary = record.veterinarySupport as Record<string, string> | undefined;
  const disease = record.diseaseInfo as Record<string, string> | undefined;
  const bankLoan = record.bankLoan as Record<string, string> | undefined;
  const verification = record.veterinarianVerification as Record<string, string> | undefined;

  const applicantDistrict = str(record.applicantDistrict ?? record.district);
  const applicantSector = str(record.applicantSector ?? record.sector);
  const applicantCell = str(record.applicantCell ?? record.cell);
  const applicantVillage = str(record.applicantVillage ?? record.village);

  return {
    girinka: parseGirinka(record.girinka),
    ownerGender: parseGender(owner?.gender ?? record.ownerGender),
    nationalId: str(owner?.nationalId ?? record.nationalId ?? record.nationalID),
    farmingExperience: str(record.farmingExperience),
    previousIncidents: str(record.previousIncidents),
    hasVeterinarian: str(veterinary?.hasVeterinarian ?? record.hasVeterinarian),
    veterinarianAvailability: str(
      veterinary?.veterinarianAvailability ?? record.veterinarianAvailability,
    ),
    knownDiseases: str(disease?.knownDiseases ?? record.knownDiseases),
    hasLoan: str(bankLoan?.hasLoan ?? record.hasLoan),
    financialInstitutionName: str(
      bankLoan?.financialInstitutionName ?? record.financialInstitutionName,
    ),
    institutionLocation: str(bankLoan?.institutionLocation ?? record.institutionLocation),
    loanAccountNumber: str(bankLoan?.loanAccountNumber ?? record.loanAccountNumber),
    loanAmount: str(bankLoan?.loanAmount ?? record.loanAmount),
    insuranceAgentCode: str(
      verification?.insuranceAgentCode ?? record.insuranceAgentCode,
    ),
    veterinarianLicenseNumber: str(
      verification?.veterinarianLicenseNumber ?? record.veterinarianLicenseNumber,
    ),
    veterinarianSignatureName: str(
      verification?.veterinarianSignatureName ?? record.veterinarianSignatureName,
    ),
    applicantAddress:
      applicantDistrict && applicantSector && applicantCell && applicantVillage
        ? {
            province: str(record.applicantProvince),
            district: applicantDistrict,
            sector: applicantSector,
            cell: applicantCell,
            village: applicantVillage,
          }
        : undefined,
  };
}
