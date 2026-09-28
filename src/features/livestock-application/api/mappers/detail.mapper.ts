import type {
  InsuredLinePayload,
  LivestockApplicationPackage,
  LivestockOwnerMode,
  LivestockSpeciesGroup,
} from '@/features/livestock-application/domain/application-types';
import type { VeterinaryApplication } from '@/features/vet-portal/types';
import {
  inferSpeciesGroup,
  isLegacyFlatVeterinaryApplication,
} from '@/features/livestock-application/api/mappers/guards';
import { buildOwnerSummary, mapApiLineRecord } from '@/features/livestock-application/api/mappers/line.mapper';
import {
  mapInsuredLinesFromRecord,
  mapPaymentProofFromRecord,
  resolvePackageOwnersList,
  resolvePackagePrimaryOwner,
} from '@/features/livestock-application/api/mappers/owners.mapper';
import {
  isFlatListApplicationRecord,
  mapFlatApplicationToPackage,
} from '@/features/livestock-application/api/mappers/flat.mapper';
import { mapApplicationExtensionFields } from '@/features/livestock-application/api/mappers/application-meta.mapper';
import {
  extractLivestockLocation,
} from '@/features/livestock-application/utils/application-location';
import { buildSubsidyCaseFromRecord } from '@/features/livestock-application/api/mappers/subsidy-case.mapper';
import { mapSonarwaReviewFromRecord, mapSubsidyDocumentsFromRecord } from '@/features/livestock-application/api/mappers/sonarwa-review.mapper';
import { readPackageTotals } from '@/features/livestock-application/api/mappers/totals.mapper';
import {
  computePremiumPercentage,
  mapLegacyStatus,
  mapPaidStatus,
  mapSubsidyStatus,
  normalizeInsuranceProvider,
  normalizeLivestockApplicationStatus,
  subsidyRequiredFromStatus,
} from '@/features/livestock-application/api/mappers/status.mapper';

function mapVeterinaryApplicationToPackage(app: VeterinaryApplication): LivestockApplicationPackage {
  const premiumRate = app.premiumRateAmount ?? 0;
  const farmer = app.farmerContributionAmount ?? 0;
  const gov = app.governmentContribution ?? 0;
  const sumAssured = app.sumAssured ?? 0;
  const subsidyRequired = subsidyRequiredFromStatus(app.subsidyStatus);

  const line: InsuredLinePayload = {
    lineType: 'INDIVIDUAL',
    quantity: 1,
    unitValue: sumAssured,
    sumAssured,
    premiumRate,
    farmerContribution: farmer,
    governmentContribution: gov,
    animal: {
      species: app.species || app.animalType || '—',
      animalCategory: app.sex,
      chipNumber: app.chipNumber,
      breed: app.breed,
    },
    tekanaEligible: Boolean(app.chipNumber?.trim()),
  };

  const submittedAt = app.submittedAt || new Date().toISOString();

  return {
    _id: app._id,
    applicationNumber: app.applicationNumber,
    insuranceProvider: normalizeInsuranceProvider(app.insuranceProvider),
    speciesGroup: inferSpeciesGroup(app.animalType, app.species),
    ownerMode: 'SINGLE_OWNER',
    status: mapLegacyStatus(app.status, app.subsidyStatus, app.paidStatus),
    submittedAt,
    updatedAt: submittedAt,
    vetId: app.agent?._id ?? '',
    vetName: app.agent?.fullName ?? '—',
    ownerSummary: app.ownerName || '—',
    lineCount: 1,
    policyStartDate: app.policyStartDate?.slice(0, 10) ?? '',
    policyEndDate: app.policyEndDate?.slice(0, 10) ?? '',
    totals: {
      premiumPercentage: computePremiumPercentage(premiumRate, sumAssured),
      premiumRateAmount: premiumRate,
      farmerContributionAmount: farmer,
      governmentContribution: gov,
      companyCommissionRate: Number(app.companyCommissionRate ?? 8),
      companyCommission: Math.round(app.companyCommission ?? 0),
      veterinaryCommission: Math.round(app.veterinaryCommission ?? 0),
      totalSumAssured: sumAssured,
    },
    paymentProof: {
      status: mapPaidStatus(app.paidStatus),
      expectedAmount: farmer,
    },
    subsidyCase: {
      required: subsidyRequired,
      status: mapSubsidyStatus(app.subsidyStatus),
    },
    lines: [line],
  };
}

function normalizePackage(pkg: LivestockApplicationPackage): LivestockApplicationPackage {
  return {
    ...pkg,
    insuranceProvider: pkg.insuranceProvider
      ? normalizeInsuranceProvider(pkg.insuranceProvider)
      : 'SONARWA',
    lineCount: pkg.lineCount ?? pkg.lines?.length ?? 0,
    paymentProof: pkg.paymentProof ?? {
      status: 'PENDING',
      expectedAmount: pkg.totals?.farmerContributionAmount ?? 0,
    },
    subsidyCase: pkg.subsidyCase ?? { required: false, status: 'NOT_REQUIRED' },
    lines: pkg.lines ?? [],
  };
}

function mapGenericPackageObject(o: Record<string, unknown>): LivestockApplicationPackage | null {
  const rawLines = Array.isArray(o.lines) ? o.lines : [];
  const lines =
    Array.isArray(o.animals) && o.animals.length > 0
      ? mapInsuredLinesFromRecord(o)
      : rawLines.map((line) => mapApiLineRecord(line as Record<string, unknown>));
  const ownersList = resolvePackageOwnersList(o);
  const primaryOwner = resolvePackagePrimaryOwner(o);
  const totals = readPackageTotals(o);

  const submittedAt = String(o.submittedAt ?? new Date().toISOString());
  const subsidyCase = o.subsidyCase as LivestockApplicationPackage['subsidyCase'] | undefined;
  const mappedPaymentProof = mapPaymentProofFromRecord(o, totals.farmerContributionAmount);

  return {
    _id: String(o._id),
    applicationNumber: String(o.applicationNumber ?? ''),
    insuranceProvider: normalizeInsuranceProvider(String(o.insuranceProvider ?? '')),
    speciesGroup: (o.speciesGroup as LivestockSpeciesGroup) ?? inferSpeciesGroup(),
    ownerMode: (o.ownerMode as LivestockOwnerMode) ?? 'SINGLE_OWNER',
    poultryProductType: o.poultryProductType as LivestockApplicationPackage['poultryProductType'],
    insuranceType: o.insuranceType ? String(o.insuranceType) : undefined,
    livestockLocation: extractLivestockLocation(o),
    status: normalizeLivestockApplicationStatus(String(o.status ?? ''))
      ?? mapLegacyStatus(
          String(o.status ?? ''),
          String(o.subsidyStatus ?? subsidyCase?.status ?? ''),
          String(o.paidStatus ?? mappedPaymentProof.status ?? ''),
        ),
    submittedAt,
    updatedAt: String(o.updatedAt ?? submittedAt),
    vetId: String((o.vetId as string) ?? (o.agent as { _id?: string })?._id ?? ''),
    vetName: String(o.vetName ?? (o.agent as { fullName?: string })?.fullName ?? '—'),
    ownerSummary: buildOwnerSummary(o, rawLines),
    primaryOwner,
    ownersList: ownersList.length > 0 ? ownersList : undefined,
    lineCount: typeof o.lineCount === 'number' ? o.lineCount : lines.length || 1,
    policyStartDate: String(o.policyStartDate ?? '').slice(0, 10),
    policyEndDate: String(o.policyEndDate ?? '').slice(0, 10),
    totals,
    paymentProof: mappedPaymentProof,
    subsidyCase: buildSubsidyCaseFromRecord(o, subsidyCase),
    sonarwaReview: mapSonarwaReviewFromRecord(o),
    subsidyDocuments: mapSubsidyDocumentsFromRecord(o),
    lines: lines.length > 0 ? lines : [],
    issuedDocuments: o.issuedDocuments as LivestockApplicationPackage['issuedDocuments'],
    insuranceIssuedAt: o.insuranceIssuedAt ? String(o.insuranceIssuedAt) : undefined,
    insuranceIssuedByName:
      o.insuranceIssuedBy && typeof o.insuranceIssuedBy === 'object'
        ? String((o.insuranceIssuedBy as { fullName?: unknown }).fullName ?? '').trim() || undefined
        : undefined,
    ...mapApplicationExtensionFields(o),
  };
}

/** Normalize a single application record → detail package for the UI. */
export function mapToLivestockApplicationPackage(item: unknown): LivestockApplicationPackage | null {
  if (!item || typeof item !== 'object') return null;

  const o = item as Record<string, unknown>;

  if (isFlatListApplicationRecord(o)) {
    return normalizePackage(mapFlatApplicationToPackage(o));
  }

  if (
    typeof o._id === 'string' &&
    (Array.isArray(o.lines) || (Array.isArray(o.animals) && o.animals.length > 0))
  ) {
    const mapped = mapGenericPackageObject(o);
    return mapped ? normalizePackage(mapped) : null;
  }

  if (isLegacyFlatVeterinaryApplication(o)) {
    return mapVeterinaryApplicationToPackage(item as VeterinaryApplication);
  }

  return null;
}
