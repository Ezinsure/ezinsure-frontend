import type {
  LivestockApplicationListItem,
  LivestockApplicationStatus,
  LivestockOwnerMode,
  LivestockSpeciesGroup,
} from '@/features/livestock-application/domain/application-types';
import type { VeterinaryApplication } from '@/features/vet-portal/types';
import {
  extractApplicationsRawRows,
  inferSpeciesGroup,
  isLegacyFlatVeterinaryApplication,
  isLivestockApplicationStatus,
  isLivestockPackageListItem,
  isNewApiApplicationRecord,
} from '@/features/livestock-application/api/mappers/guards';
import { buildOwnerSummary } from '@/features/livestock-application/api/mappers/line.mapper';
import {
  mapLegacyStatus,
  mapPaidStatus,
  normalizeInsuranceProvider,
  subsidyRequiredFromStatus,
} from '@/features/livestock-application/api/mappers/status.mapper';

function mapNewApiApplicationToListItem(o: Record<string, unknown>): LivestockApplicationListItem {
  const lines = o.lines as unknown[];
  const statusRaw = String(o.status ?? '');

  return {
    _id: String(o._id),
    applicationNumber: String(o.applicationNumber),
    insuranceProvider: normalizeInsuranceProvider(String(o.insuranceProvider ?? '')),
    speciesGroup: o.speciesGroup as LivestockSpeciesGroup,
    ownerMode: (o.ownerMode as LivestockOwnerMode) ?? 'SINGLE_OWNER',
    status: isLivestockApplicationStatus(statusRaw)
      ? statusRaw
      : mapLegacyStatus(statusRaw, String(o.subsidyStatus ?? ''), String(o.paidStatus ?? '')),
    ownerSummary: buildOwnerSummary(o, lines),
    lineCount: lines.length,
    totals: {
      farmerContributionAmount: Number(o.farmerContributionAmount ?? 0),
      premiumRateAmount: Number(o.premiumRateAmount ?? 0),
    },
    submittedAt: String(o.submittedAt ?? new Date().toISOString()),
    paymentProofStatus: mapPaidStatus(String(o.paymentProofStatus ?? o.paidStatus ?? '')),
    subsidyRequired: subsidyRequiredFromStatus(String(o.subsidyStatus ?? '')),
  };
}

function mapVeterinaryApplicationToListItem(app: VeterinaryApplication): LivestockApplicationListItem {
  const subsidyRequired = subsidyRequiredFromStatus(app.subsidyStatus);

  return {
    _id: app._id,
    applicationNumber: app.applicationNumber,
    insuranceProvider: normalizeInsuranceProvider(app.insuranceProvider),
    speciesGroup: inferSpeciesGroup(app.animalType, app.species),
    ownerMode: 'SINGLE_OWNER',
    status: mapLegacyStatus(app.status, app.subsidyStatus, app.paidStatus),
    ownerSummary: app.ownerName || '—',
    lineCount: 1,
    totals: {
      farmerContributionAmount: app.farmerContributionAmount ?? 0,
      premiumRateAmount: app.premiumRateAmount ?? 0,
    },
    submittedAt: app.submittedAt,
    paymentProofStatus: mapPaidStatus(app.paidStatus),
    subsidyRequired,
  };
}

/** Normalize GET /getVeterinaryApplications rows → list items for the UI. */
export function mapToLivestockApplicationListItem(item: unknown): LivestockApplicationListItem | null {
  if (!item || typeof item !== 'object') return null;

  if (isLivestockPackageListItem(item)) {
    return item;
  }

  const o = item as Record<string, unknown>;

  if (isNewApiApplicationRecord(o)) {
    return mapNewApiApplicationToListItem(o);
  }

  if (isLegacyFlatVeterinaryApplication(o)) {
    return mapVeterinaryApplicationToListItem(item as VeterinaryApplication);
  }

  if (typeof o._id === 'string' && typeof o.applicationNumber === 'string') {
    return {
      _id: o._id,
      applicationNumber: o.applicationNumber,
      insuranceProvider: normalizeInsuranceProvider(String(o.insuranceProvider ?? '')),
      speciesGroup: (o.speciesGroup as LivestockSpeciesGroup) ?? inferSpeciesGroup(),
      ownerMode: (o.ownerMode as LivestockOwnerMode) ?? 'SINGLE_OWNER',
      status: isLivestockApplicationStatus(String(o.status ?? ''))
        ? (o.status as LivestockApplicationStatus)
        : mapLegacyStatus(String(o.status ?? ''), String(o.subsidyStatus ?? ''), String(o.paidStatus ?? '')),
      ownerSummary: buildOwnerSummary(o, Array.isArray(o.lines) ? o.lines : []),
      lineCount:
        typeof o.lineCount === 'number'
          ? o.lineCount
          : Array.isArray(o.lines)
            ? o.lines.length
            : 1,
      totals: {
        farmerContributionAmount: Number(
          (o.totals as { farmerContributionAmount?: number })?.farmerContributionAmount ??
            o.farmerContributionAmount ??
            0,
        ),
        premiumRateAmount: Number(
          (o.totals as { premiumRateAmount?: number })?.premiumRateAmount ?? o.premiumRateAmount ?? 0,
        ),
      },
      submittedAt: String(o.submittedAt ?? new Date().toISOString()),
      paymentProofStatus: mapPaidStatus(String(o.paymentProofStatus ?? o.paidStatus ?? '')),
      subsidyRequired: subsidyRequiredFromStatus(String(o.subsidyStatus ?? '')) || Boolean(o.subsidyRequired),
    };
  }

  return null;
}

export function mapApplicationsListResponse(payload: unknown): LivestockApplicationListItem[] {
  return extractApplicationsRawRows(payload)
    .map(mapToLivestockApplicationListItem)
    .filter((item): item is LivestockApplicationListItem => item !== null);
}

export { extractApplicationsRawRows };
