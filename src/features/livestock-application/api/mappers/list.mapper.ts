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
import { countInsuredLines } from '@/features/livestock-application/api/mappers/owners.mapper';
import {
  isFlatListApplicationRecord,
  mapFlatApplicationToListItem,
} from '@/features/livestock-application/api/mappers/flat.mapper';
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

  if (isFlatListApplicationRecord(o)) {
    return mapFlatApplicationToListItem(o);
  }

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
          : countInsuredLines(o) || 1,
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

export interface ApplicationsListPaginationMeta {
  total: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

/** Read pagination fields from GET /getVeterinaryApplications envelope. */
export function extractApplicationsListPaginationMeta(
  payload: unknown,
  fallback: { pageNumber: number; pageSize: number; dataLength: number },
): ApplicationsListPaginationMeta {
  const root =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;

  const pagination =
    root?.pagination && typeof root.pagination === 'object'
      ? (root.pagination as Record<string, unknown>)
      : null;

  const total = Number(
    pagination?.totalCount ??
      root?.total ??
      root?.totalCount ??
      root?.totalRecords ??
      root?.count ??
      fallback.dataLength,
  );
  const pageSize =
    Number(pagination?.pageSize ?? root?.pageSize ?? root?.limit ?? fallback.pageSize) ||
    fallback.pageSize;
  const pageNumber =
    Number(pagination?.pageNumber ?? root?.pageNumber ?? root?.page ?? fallback.pageNumber) ||
    fallback.pageNumber;
  const totalPages = Number(
    pagination?.totalPages ??
      root?.totalPages ??
      Math.max(1, Math.ceil((Number.isFinite(total) ? total : fallback.dataLength) / pageSize)),
  );

  return {
    total: Number.isFinite(total) ? total : fallback.dataLength,
    pageNumber,
    pageSize,
    totalPages: Number.isFinite(totalPages) ? totalPages : 1,
  };
}

export { extractApplicationsRawRows };
