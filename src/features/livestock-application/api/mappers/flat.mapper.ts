import type {
  LivestockApplicationListItem,
  LivestockApplicationPackage,
  LivestockApplicationStatus,
  LivestockOwnerMode,
  LivestockSpeciesGroup,
} from '@/features/livestock-application/domain/application-types';
import {
  extractLivestockLocation,
  formatLocationSummary,
} from '@/features/livestock-application/utils/application-location';
import {
  isLivestockApplicationStatus,
} from '@/features/livestock-application/api/mappers/guards';
import {
  countInsuredLines,
  mapInsuredLinesFromRecord,
  mapPaymentProofFromRecord,
  resolveOwnerSummaryFromRecord,
  resolvePackageOwnersList,
  resolvePackagePrimaryOwner,
} from '@/features/livestock-application/api/mappers/owners.mapper';
import {
  computePremiumPercentage,
  mapLegacyStatus,
  mapSubsidyStatus,
  normalizeInsuranceProvider,
  subsidyRequiredFromStatus,
} from '@/features/livestock-application/api/mappers/status.mapper';

/** GET /getVeterinaryApplications & /getAllApplications row (animals[], no nested lines[]). */
export function isFlatListApplicationRecord(record: Record<string, unknown>): boolean {
  return (
    typeof record._id === 'string' &&
    typeof record.applicationNumber === 'string' &&
    typeof record.speciesGroup === 'string' &&
    !Array.isArray(record.lines)
  );
}

function readTotals(record: Record<string, unknown>) {
  const premiumRateAmount = Number(record.premiumRateAmount ?? 0);
  const farmerContributionAmount = Number(record.farmerContributionAmount ?? 0);
  const governmentContribution = Number(record.governmentContribution ?? 0);
  const companyCommission = Math.round(Number(record.companyCommission ?? 0));
  const veterinaryCommission = Math.round(Number(record.veterinaryCommission ?? 0));
  const totalSumAssured = Number(record.totalSumAssured ?? 0);

  return {
    premiumRateAmount,
    farmerContributionAmount,
    governmentContribution,
    companyCommission,
    veterinaryCommission,
    totalSumAssured,
    premiumPercentage: computePremiumPercentage(premiumRateAmount, totalSumAssured),
  };
}

export function mapFlatApplicationToListItem(
  record: Record<string, unknown>,
): LivestockApplicationListItem {
  const location = extractLivestockLocation(record);
  const totals = readTotals(record);
  const statusRaw = String(record.status ?? '');
  const subsidyStatus = String(record.subsidyStatus ?? '');
  const paidStatus = String(record.paidStatus ?? '');
  const paymentProof = mapPaymentProofFromRecord(record, totals.farmerContributionAmount);

  return {
    _id: String(record._id),
    applicationNumber: String(record.applicationNumber),
    insuranceProvider: normalizeInsuranceProvider(String(record.insuranceProvider ?? '')),
    speciesGroup: record.speciesGroup as LivestockSpeciesGroup,
    ownerMode: (record.ownerMode as LivestockOwnerMode) ?? 'SINGLE_OWNER',
    poultryProductType: record.poultryProductType
      ? (String(record.poultryProductType) as LivestockApplicationListItem['poultryProductType'])
      : undefined,
    insuranceType: record.insuranceType ? String(record.insuranceType) : undefined,
    policyStartDate: String(record.policyStartDate ?? ''),
    policyEndDate: String(record.policyEndDate ?? ''),
    livestockLocation: location,
    totalSumAssured: totals.totalSumAssured,
    governmentContribution: totals.governmentContribution,
    veterinaryCommission: totals.veterinaryCommission,
    status: isLivestockApplicationStatus(statusRaw)
      ? statusRaw
      : mapLegacyStatus(statusRaw, subsidyStatus, paidStatus),
    ownerSummary: resolveOwnerSummaryFromRecord(record, formatLocationSummary(location)),
    lineCount: countInsuredLines(record),
    totals: {
      farmerContributionAmount: totals.farmerContributionAmount,
      premiumRateAmount: totals.premiumRateAmount,
    },
    submittedAt: String(record.submittedAt ?? new Date().toISOString()),
    paymentProofStatus: paymentProof.status,
    paymentProofDocumentUrl: paymentProof.documentUrl,
    subsidyRequired: subsidyRequiredFromStatus(subsidyStatus),
    paidStatus,
    subsidyStatus,
    vetName: String((record.agent as { fullName?: string } | undefined)?.fullName ?? '').trim() || undefined,
  };
}

export function mapFlatApplicationToPackage(
  record: Record<string, unknown>,
): LivestockApplicationPackage {
  const listItem = mapFlatApplicationToListItem(record);
  const totals = readTotals(record);
  const location = extractLivestockLocation(record);
  const submittedAt = listItem.submittedAt;
  const subsidyStatus = String(record.subsidyStatus ?? '');

  const lines = mapInsuredLinesFromRecord(record);
  const ownersList = resolvePackageOwnersList(record);
  const primaryOwner = resolvePackagePrimaryOwner(record);

  return {
    _id: listItem._id,
    applicationNumber: listItem.applicationNumber,
    speciesGroup: listItem.speciesGroup,
    ownerMode: listItem.ownerMode,
    poultryProductType: listItem.poultryProductType,
    insuranceType: listItem.insuranceType,
    insuranceProvider: listItem.insuranceProvider,
    livestockLocation: location,
    status: listItem.status as LivestockApplicationStatus,
    submittedAt,
    updatedAt: String(record.updatedAt ?? submittedAt),
    vetId: String((record.agent as { _id?: string } | undefined)?._id ?? ''),
    vetName: String((record.agent as { fullName?: string } | undefined)?.fullName ?? '—'),
    ownerSummary: listItem.ownerSummary,
    primaryOwner,
    ownersList: ownersList.length > 0 ? ownersList : undefined,
    lineCount: lines.length,
    policyStartDate: String(record.policyStartDate ?? '').slice(0, 10),
    policyEndDate: String(record.policyEndDate ?? '').slice(0, 10),
    totals,
    paymentProof: mapPaymentProofFromRecord(record, totals.farmerContributionAmount),
    subsidyCase: {
      required: subsidyRequiredFromStatus(subsidyStatus),
      status: mapSubsidyStatus(subsidyStatus),
    },
    lines,
  };
}
