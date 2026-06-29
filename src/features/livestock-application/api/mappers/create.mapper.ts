import type { CreateLivestockApplicationPayload } from '@/features/livestock-application/domain/application-types';
import type {
  CreateApplicationResult,
  NewLivestockApplicationBody,
} from '@/features/livestock-application/api/backend-types';
import { pickDefinedStrings } from '@/features/livestock-application/api/mappers/line.mapper';
import { LivestockApiError } from '@/features/livestock-application/api/http';

function mapOwner(
  owner: NonNullable<CreateLivestockApplicationPayload['owner']>,
): NewLivestockApplicationBody['owner'] {
  const mapped: NonNullable<NewLivestockApplicationBody['owner']> = {
    name: owner.name.trim(),
    phone: owner.phone.trim(),
    district: owner.district.trim(),
    sector: owner.sector.trim(),
    cell: owner.cell.trim(),
    village: owner.village.trim(),
  };
  if (owner.nationalId?.trim()) mapped.nationalId = owner.nationalId.trim();
  if (owner.gender) mapped.gender = owner.gender;
  if (owner.province?.trim()) mapped.province = owner.province.trim();
  return mapped;
}

function mapLivestockLocation(
  location: CreateLivestockApplicationPayload['livestockLocation'],
): NewLivestockApplicationBody['livestockLocation'] {
  const mapped: NewLivestockApplicationBody['livestockLocation'] = {
    district: location.district.trim(),
    sector: location.sector.trim(),
    cell: location.cell.trim(),
    village: location.village.trim(),
  };

  if (location.province?.trim()) {
    mapped.province = location.province.trim();
  }

  return mapped;
}

function mapLine(
  line: CreateLivestockApplicationPayload['lines'][number],
  ownerMode: CreateLivestockApplicationPayload['ownerMode'],
): NewLivestockApplicationBody['lines'][number] {
  const mapped: NewLivestockApplicationBody['lines'][number] = {
    lineType: line.lineType,
    quantity: line.quantity,
    unitValue: line.unitValue,
    sumAssured: line.sumAssured,
    tekanaEligible: line.tekanaEligible,
    animal: pickDefinedStrings({
      species: line.animal.species,
      chipNumber: line.animal.chipNumber,
      animalCategory: line.animal.animalCategory,
      animalAge: line.animal.animalAge,
      breed: line.animal.breed,
      color: line.animal.color,
      productivity: line.animal.productivity,
      hatcherySource: line.animal.hatcherySource,
      poultryProductType: line.animal.poultryProductType,
      vaccinationInfo: line.animal.vaccinationInfo,
    }),
  };

  if (
    ownerMode === 'MULTI_OWNER' &&
    line.owner?.name?.trim() &&
    line.owner?.phone?.trim()
  ) {
    mapped.owner = {
      name: line.owner.name.trim(),
      phone: line.owner.phone.trim(),
      nationalId: line.owner.nationalId?.trim() ?? '',
    };
    if (line.owner.gender) {
      mapped.owner.gender = line.owner.gender;
    }
  }

  return mapped;
}

function mapVeterinarySupport(
  support: CreateLivestockApplicationPayload['veterinarySupport'],
): NewLivestockApplicationBody['veterinarySupport'] | undefined {
  if (!support) return undefined;
  const hasVeterinarian = String(support.hasVeterinarian ?? '').trim();
  const veterinarianAvailability = String(support.veterinarianAvailability ?? '').trim();
  if (!hasVeterinarian && !veterinarianAvailability) return undefined;
  return {
    hasVeterinarian,
    veterinarianAvailability,
  };
}

function mapDiseaseInfo(
  disease: CreateLivestockApplicationPayload['diseaseInfo'],
): NewLivestockApplicationBody['diseaseInfo'] | undefined {
  if (!disease) return undefined;
  const knownDiseases = String(disease.knownDiseases ?? '').trim();
  if (!knownDiseases) return undefined;
  return { knownDiseases };
}

function mapBankLoan(
  loan: CreateLivestockApplicationPayload['bankLoan'],
): NewLivestockApplicationBody['bankLoan'] | undefined {
  if (!loan) return undefined;
  const hasLoan = String(loan.hasLoan ?? '').trim();
  if (!hasLoan) return undefined;
  const mapped: NonNullable<NewLivestockApplicationBody['bankLoan']> = { hasLoan };
  const financialInstitutionName = String(loan.financialInstitutionName ?? '').trim();
  const institutionLocation = String(loan.institutionLocation ?? '').trim();
  const loanAccountNumber = String(loan.loanAccountNumber ?? '').trim();
  const loanAmount = String(loan.loanAmount ?? '').trim();
  if (financialInstitutionName) mapped.financialInstitutionName = financialInstitutionName;
  if (institutionLocation) mapped.institutionLocation = institutionLocation;
  if (loanAccountNumber) mapped.loanAccountNumber = loanAccountNumber;
  if (loanAmount) mapped.loanAmount = loanAmount;
  return mapped;
}

function mapVeterinarianVerification(
  verification: CreateLivestockApplicationPayload['veterinarianVerification'],
): NewLivestockApplicationBody['veterinarianVerification'] | undefined {
  if (!verification) return undefined;
  const veterinarianLicenseNumber = verification.veterinarianLicenseNumber.trim();
  const veterinarianSignatureName = verification.veterinarianSignatureName.trim();
  const insuranceAgentCode = verification.insuranceAgentCode?.trim();
  if (!veterinarianLicenseNumber && !veterinarianSignatureName && !insuranceAgentCode) {
    return undefined;
  }
  return {
    veterinarianLicenseNumber,
    veterinarianSignatureName,
    ...(insuranceAgentCode ? { insuranceAgentCode } : {}),
  };
}

/**
 * Map form payload → POST /newApplication JSON body.
 * Sends camelCase fields only; agentId comes from JWT on the server.
 */
export function toNewApplicationBody(
  payload: CreateLivestockApplicationPayload,
): NewLivestockApplicationBody {
  const body: NewLivestockApplicationBody = {
    speciesGroup: payload.speciesGroup,
    ownerMode: payload.ownerMode,
    policyStartDate: payload.policyStartDate,
    policyEndDate: payload.policyEndDate,
    livestockLocation: mapLivestockLocation(payload.livestockLocation),
    premiumTotals: {
      premiumPercentage: payload.premiumTotals.premiumPercentage,
      premiumRateAmount: payload.premiumTotals.premiumRateAmount,
      farmerContributionAmount: payload.premiumTotals.farmerContributionAmount,
      governmentContribution: payload.premiumTotals.governmentContribution,
      companyCommission: payload.premiumTotals.companyCommission,
      veterinaryCommission: payload.premiumTotals.veterinaryCommission,
      totalSumAssured: payload.premiumTotals.totalSumAssured,
    },
    lines: payload.lines.map((line) => mapLine(line, payload.ownerMode)),
  };

  if (payload.poultryProductType) {
    body.poultryProductType = payload.poultryProductType;
  }

  if (payload.insuranceType === 'New' || payload.insuranceType === 'Renewal') {
    body.insuranceType = payload.insuranceType;
  }

  if (payload.ownerMode === 'SINGLE_OWNER' && payload.owner) {
    body.owner = mapOwner(payload.owner);
  }

  if (payload.girinka) {
    body.girinka = payload.girinka;
  }

  const farmingExperience = payload.farmingExperience?.trim();
  if (farmingExperience) {
    body.farmingExperience = farmingExperience;
  }

  const previousIncidents = payload.previousIncidents?.trim();
  if (previousIncidents) {
    body.previousIncidents = previousIncidents;
  }

  const veterinarySupport = mapVeterinarySupport(payload.veterinarySupport);
  if (veterinarySupport) {
    body.veterinarySupport = veterinarySupport;
  }

  const diseaseInfo = mapDiseaseInfo(payload.diseaseInfo);
  if (diseaseInfo) {
    body.diseaseInfo = diseaseInfo;
  }

  const bankLoan = mapBankLoan(payload.bankLoan);
  if (bankLoan) {
    body.bankLoan = bankLoan;
  }

  const veterinarianVerification = mapVeterinarianVerification(payload.veterinarianVerification);
  if (veterinarianVerification) {
    body.veterinarianVerification = veterinarianVerification;
  }

  return body;
}

export function parseCreateApplicationResponse(payload: unknown): CreateApplicationResult {
  const root = payload as Record<string, unknown>;
  const nested =
    (root.application as Record<string, unknown> | undefined) ??
    (root.data as Record<string, unknown> | undefined) ??
    root;

  const _id = String(nested._id ?? nested.id ?? '');
  const applicationNumber = String(nested.applicationNumber ?? nested.application_number ?? '');
  const status = String(nested.status ?? 'SUBMITTED');
  const submittedAtRaw = nested.submittedAt ?? nested.submitted_at;
  const submittedAt =
    typeof submittedAtRaw === 'string' && submittedAtRaw.trim()
      ? submittedAtRaw.trim()
      : undefined;

  if (!_id) {
    throw new LivestockApiError('Server did not return an application id.', 500);
  }

  return { _id, applicationNumber, status, submittedAt };
}
