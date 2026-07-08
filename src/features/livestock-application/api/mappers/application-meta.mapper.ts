import type { LivestockApplicationPackage } from '@/features/livestock-application/domain/application-types';
import {
  normalizeOwnerRecord,
  parseOwnerGender,
} from '@/features/livestock-application/api/mappers/owner-fields';

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

function buildApplicantAddress(
  record: Record<string, unknown>,
  owner?: Record<string, unknown>,
): LivestockApplicationPackage['applicantAddress'] | undefined {
  const province = str(record.applicantProvince ?? owner?.province);
  const district = str(record.applicantDistrict ?? owner?.district ?? record.district);
  const sector = str(record.applicantSector ?? owner?.sector ?? record.sector);
  const cell = str(record.applicantCell ?? owner?.cell ?? record.cell);
  const village = str(record.applicantVillage ?? owner?.village ?? record.village);

  if (!district && !sector && !cell && !village) return undefined;

  return {
    province,
    district: district ?? '',
    sector: sector ?? '',
    cell: cell ?? '',
    village: village ?? '',
  };
}

/** Map optional application-level fields from API records into the detail package. */
export function mapApplicationExtensionFields(
  record: Record<string, unknown>,
): Partial<LivestockApplicationPackage> {
  const ownerRaw = record.owner;
  const owner =
    ownerRaw && typeof ownerRaw === 'object'
      ? (ownerRaw as Record<string, unknown>)
      : undefined;
  const normalizedOwner = owner ? normalizeOwnerRecord(owner) : undefined;
  const veterinary = record.veterinarySupport as Record<string, string> | undefined;
  const disease = record.diseaseInfo as Record<string, string> | undefined;
  const bankLoan = record.bankLoan as Record<string, string> | undefined;
  const verification = record.veterinarianVerification as Record<string, string> | undefined;

  return {
    girinka: parseGirinka(record.girinka),
    ownerGender:
      normalizedOwner?.gender ??
      parseOwnerGender(record.ownerGender ?? owner?.ownerGender ?? owner?.gender),
    nationalId: str(
      normalizedOwner?.nationalId ??
        record.nationalId ??
        record.nationalID ??
        owner?.ownerNationalId,
    ),
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
    insuranceAgentCode: str(verification?.insuranceAgentCode ?? record.insuranceAgentCode),
    veterinarianLicenseNumber: str(
      verification?.veterinarianLicenseNumber ?? record.veterinarianLicenseNumber,
    ),
    veterinarianSignatureName: str(
      verification?.veterinarianSignatureName ?? record.veterinarianSignatureName,
    ),
    applicantAddress: buildApplicantAddress(record, owner),
  };
}
