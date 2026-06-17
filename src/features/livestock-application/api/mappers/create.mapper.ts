import type { CreateLivestockApplicationPayload } from '@/features/livestock-application/domain/application-types';
import type {
  CreateApplicationResult,
  NewLivestockApplicationBody,
} from '@/features/livestock-application/api/backend-types';
import { pickDefinedStrings } from '@/features/livestock-application/api/mappers/line.mapper';
import { LivestockApiError } from '@/features/livestock-application/api/http';

/** Map form payload → POST /newApplication body (strips UI-only fields). */
export function toNewApplicationBody(
  payload: CreateLivestockApplicationPayload,
): NewLivestockApplicationBody {
  const body: NewLivestockApplicationBody = {
    speciesGroup: payload.speciesGroup,
    ownerMode: payload.ownerMode,
    policyStartDate: payload.policyStartDate,
    policyEndDate: payload.policyEndDate,
    livestockLocation: {
      district: payload.livestockLocation.district,
      sector: payload.livestockLocation.sector,
      cell: payload.livestockLocation.cell,
      village: payload.livestockLocation.village,
    },
    premiumTotals: {
      premiumRateAmount: payload.premiumTotals.premiumRateAmount,
      farmerContributionAmount: payload.premiumTotals.farmerContributionAmount,
      governmentContribution: payload.premiumTotals.governmentContribution,
      companyCommission: payload.premiumTotals.companyCommission,
      veterinaryCommission: payload.premiumTotals.veterinaryCommission,
    },
    lines: payload.lines.map((line) => ({
      lineType: line.lineType,
      quantity: line.quantity,
      unitValue: line.unitValue,
      sumAssured: line.sumAssured,
      tekanaEligible: line.tekanaEligible,
      ...(line.owner?.name || line.owner?.phone
        ? { owner: { name: line.owner.name, phone: line.owner.phone } }
        : {}),
      animal: pickDefinedStrings({
        species: line.animal.species,
        chipNumber: line.animal.chipNumber,
        hatcherySource: line.animal.hatcherySource,
        animalCategory: line.animal.animalCategory,
        animalAge: line.animal.animalAge,
        breed: line.animal.breed,
        color: line.animal.color,
        productivity: line.animal.productivity,
        poultryProductType: line.animal.poultryProductType,
      }),
    })),
  };

  if (payload.poultryProductType) {
    body.poultryProductType = payload.poultryProductType;
  }

  if (payload.owner) {
    body.owner = {
      name: payload.owner.name,
      phone: payload.owner.phone,
      district: payload.owner.district,
      sector: payload.owner.sector,
      cell: payload.owner.cell,
      village: payload.owner.village,
    };
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

  if (!_id) {
    throw new LivestockApiError('Server did not return an application id.', 500);
  }

  return { _id, applicationNumber, status };
}
