/**
 * Shared renewal API helpers for Motor and Livestock.
 *
 * POST /createRenewalApplication/{module} now accepts a full edited application
 * payload. The backend must recalculate discount and commissions and must not
 * trust frontend-calculated amounts.
 *
 * Discount attribution (backend source of truth):
 * - Deduct 1% of net premium from company commission by default.
 * - If the original application was brought by an agent (motor) or vet
 *   (livestock), deduct from that producer’s commission instead.
 */
import type { Application } from '@/features/admin-motor-applications/types';
import type { CreateLivestockApplicationPayload } from '@/features/livestock-application/domain/application-types';
import type { ApiFetch } from '@/features/livestock-application/api/http';
import { requestJson, unwrapEntityPayload } from '@/features/livestock-application/api/http';
import {
  computeRenewalPricing,
  resolveRenewalDiscountBearer,
  type RenewalPricingBreakdown,
} from '@/features/renewals/renewal-pricing';
import {
  isPolicyExpired,
  parseBooleanFlag,
  type RenewalListBucket,
} from '@/features/renewals/renewal-eligibility';

export type RenewalModule = 'motor' | 'livestock';

export interface RenewalListFilters {
  /** Insurance category label, e.g. "Car Insurance". */
  insuranceCategory?: string;
  /** Filter by originating agent / vet user id. */
  agentId?: string;
  /** Client / livestock location filters. */
  province?: string;
  district?: string;
}

export interface RenewingApplicationSummary {
  _id: string;
  applicationNumber: string;
  clientName: string;
  phone?: string;
  email?: string;
  policyEndDate: string;
  netPremium: number;
  agentCommission: number;
  companyCommission: number;
  module: RenewalModule;
  plateNumber?: string;
  speciesGroup?: string;
  insuranceCategory?: string;
  daysUntilExpiry?: number;
  /** True when another motor policy for the same plate is still in force. */
  hasActiveInsuranceForPlate?: boolean;
  /** Backend hint; frontend still enforces expiry + plate rules. */
  canRenew?: boolean;
  /** Originating agent (motor) or vet (livestock). */
  agent?: {
    _id: string;
    fullName: string;
    email?: string;
    phoneNumber?: string;
  } | null;
  /** True when discount should come from agent/vet commission. */
  hasOriginatingAgent: boolean;
  province?: string;
  district?: string;
  sector?: string;
}

export interface MotorRenewalApplicationPayload {
  /** Comprehensive vs third-party cover — same values as motor create application. */
  insuranceType: string;
  insuranceCategory?: string;
  insuranceDuration?: string;
  insuranceProvider?: string;
  isCOMESA?: boolean;
  policyStartDate?: string;
  policyEndDate?: string;
  insuranceEndAt?: string;
  client?: {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    address?: string;
    nationalID?: string;
    identificationDocumentType?: string;
    identificationNumber?: string;
    province?: string;
    district?: string;
    sector?: string;
  };
  vehicle?: {
    vehicleType?: string;
    vehicleAge?: string;
    plateNumber?: string;
    chasisNumber?: string;
    vehicleUse?: string;
    otherVehicleUse?: string;
  };
  amount?: number;
  netPremium?: number;
  agentCommission?: number;
  companyCommission?: number;
  administrationFees?: string;
}

export interface CreateRenewalApplicationRequest {
  originalApplicationId: string;
  module: RenewalModule;
  notes?: string;
  /** Edited livestock create payload. Required for livestock renewals. */
  application?: CreateLivestockApplicationPayload | MotorRenewalApplicationPayload;
}

export const RENEWAL_ENDPOINTS = {
  listExpiring: (
    module: RenewalModule,
    startDate: string,
    endDate: string,
    bucket?: RenewalListBucket,
    filters?: RenewalListFilters,
  ): string => {
    const search = new URLSearchParams({ startDate, endDate, module });
    if (bucket === 'upcoming') search.set('bucket', 'upcoming');
    if (bucket === 'eligible') search.set('bucket', 'expired');
    if (filters?.insuranceCategory) search.set('insuranceCategory', filters.insuranceCategory);
    if (filters?.agentId) search.set('agentId', filters.agentId);
    if (filters?.province) search.set('province', filters.province);
    if (filters?.district) search.set('district', filters.district);
    return `/getApplicationsEligibleForRenewal?${search.toString()}`;
  },
  preview: (module: RenewalModule, applicationId: string): string =>
    `/getRenewalPreview/${encodeURIComponent(module)}/${encodeURIComponent(applicationId)}`,
  create: (module: RenewalModule): string => `/createRenewalApplication/${module}`,
  motorApplicationById: (applicationId: string): string =>
    `/getMotorApplicationById/${encodeURIComponent(applicationId)}`,
  motorApplicationByIdFallback: (applicationId: string): string =>
    `/getApplicationById/${encodeURIComponent(applicationId)}`,
  activeMotorByPlate: (plateNumber: string, excludeApplicationId?: string): string => {
    const search = new URLSearchParams({ plateNumber });
    if (excludeApplicationId) search.set('excludeApplicationId', excludeApplicationId);
    return `/hasActiveMotorInsurance?${search.toString()}`;
  },
} as const;

function daysUntil(dateIso: string): number {
  const end = new Date(dateIso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function nestedRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function firstNonEmpty(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return undefined;
}

function mapAgent(row: Record<string, unknown>) {
  const agent =
    nestedRecord(row.agent) ??
    nestedRecord(row.veterinary) ??
    nestedRecord(row.vet) ??
    nestedRecord(row.createdBy);
  if (!agent) return null;
  const id = firstNonEmpty(agent._id, agent.id);
  const fullName = firstNonEmpty(agent.fullName, agent.name, agent.email);
  if (!id || !fullName) return null;
  return {
    _id: String(id),
    fullName: String(fullName),
    email: firstNonEmpty(agent.email),
    phoneNumber: firstNonEmpty(agent.phoneNumber, agent.phone),
  };
}

function mapRenewalRow(row: Record<string, unknown>, module: RenewalModule): RenewingApplicationSummary {
  const client = nestedRecord(row.client);
  const vehicle = nestedRecord(row.vehicle);
  const location =
    nestedRecord(row.livestockLocation) ??
    nestedRecord(row.location) ??
    nestedRecord(row.applicantLocation);
  const policyEndDate = String(row.policyEndDate ?? row.insuranceEndAt ?? row.endDate ?? '');
  const hasActiveInsuranceForPlate = parseBooleanFlag(
    row.hasActiveInsuranceForPlate ?? row.hasActiveCover ?? row.hasActiveInsurance,
  );
  const canRenewFlag = parseBooleanFlag(row.canRenew);
  const agent = mapAgent(row);
  const hasOriginatingAgentFlag = parseBooleanFlag(
    row.hasOriginatingAgent ?? row.broughtByAgent ?? row.hasAgent,
  );
  const hasOriginatingAgent =
    hasOriginatingAgentFlag === true
      ? true
      : hasOriginatingAgentFlag === false
        ? false
        : Boolean(agent);

  return {
    _id: String(row._id ?? row.id ?? ''),
    applicationNumber: String(row.applicationNumber ?? ''),
    clientName: String(
      firstNonEmpty(
        row.clientName,
        row.ownerName,
        row.ownerSummary,
        client?.fullName,
        client?.name,
      ) ?? '—',
    ),
    phone: firstNonEmpty(
      row.phone,
      row.phoneNumber,
      row.ownerPhone,
      client?.phone,
      client?.phoneNumber,
    ),
    email: firstNonEmpty(row.email, client?.email),
    policyEndDate,
    netPremium: Number(row.netPremium ?? row.amount ?? row.farmerContributionAmount ?? 0),
    agentCommission: Number(row.agentCommission ?? row.veterinaryCommission ?? 0),
    companyCommission: Number(row.companyCommission ?? 0),
    module,
    plateNumber: firstNonEmpty(row.plateNumber, vehicle?.plateNumber),
    speciesGroup: row.speciesGroup ? String(row.speciesGroup) : undefined,
    insuranceCategory: firstNonEmpty(
      row.insuranceCategory,
      row.category,
      module === 'livestock' ? row.speciesGroup : undefined,
    ),
    daysUntilExpiry: policyEndDate ? daysUntil(policyEndDate) : undefined,
    hasActiveInsuranceForPlate,
    canRenew: canRenewFlag,
    agent,
    hasOriginatingAgent,
    province: firstNonEmpty(
      row.province,
      client?.province,
      location?.province,
      location?.Province,
    ),
    district: firstNonEmpty(
      row.district,
      client?.district,
      location?.district,
      location?.District,
    ),
    sector: firstNonEmpty(row.sector, client?.sector, location?.sector, location?.Sector),
  };
}

export async function fetchRenewalEligibleApplications(
  apiFetch: ApiFetch,
  module: RenewalModule,
  startDate: string,
  endDate: string,
  bucket?: RenewalListBucket,
  filters?: RenewalListFilters,
): Promise<RenewingApplicationSummary[]> {
  try {
    const response = await requestJson<unknown>(
      apiFetch,
      RENEWAL_ENDPOINTS.listExpiring(module, startDate, endDate, bucket, filters),
      { method: 'GET' },
      'renewals-list',
    );
    const data = unwrapEntityPayload(response);
    const rows = Array.isArray(data)
      ? data
      : data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)
        ? (data as { data: unknown[] }).data
        : [];
    return rows
      .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
      .map((r) => mapRenewalRow(r, module));
  } catch {
    return [];
  }
}

export function buildLocalRenewalPreview(
  application: RenewingApplicationSummary,
): RenewalPricingBreakdown {
  return computeRenewalPricing({
    netPremium: application.netPremium,
    agentCommission: application.agentCommission,
    companyCommission: application.companyCommission,
    hasOriginatingAgent: application.hasOriginatingAgent,
    discountBearer: resolveRenewalDiscountBearer({
      hasOriginatingAgent: application.hasOriginatingAgent,
    }),
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export async function fetchRenewalPreview(
  apiFetch: ApiFetch,
  module: RenewalModule,
  applicationId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const response = await requestJson<unknown>(
      apiFetch,
      RENEWAL_ENDPOINTS.preview(module, applicationId),
      { method: 'GET' },
      'renewals-list',
    );
    const data = unwrapEntityPayload(response);
    return asRecord(data);
  } catch {
    return null;
  }
}

export async function fetchMotorApplicationForRenewal(
  apiFetch: ApiFetch,
  applicationId: string,
): Promise<Application | null> {
  const preview = await fetchRenewalPreview(apiFetch, 'motor', applicationId);
  const nested =
    asRecord(preview?.originalApplication) ??
    asRecord(preview?.application) ??
    (preview && preview._id ? preview : null);
  if (nested && (nested.client || nested.vehicle || nested.applicationNumber)) {
    return nested as unknown as Application;
  }

  for (const path of [
    RENEWAL_ENDPOINTS.motorApplicationById(applicationId),
    RENEWAL_ENDPOINTS.motorApplicationByIdFallback(applicationId),
  ]) {
    try {
      const response = await requestJson<unknown>(apiFetch, path, { method: 'GET' }, 'renewals-list');
      const data = unwrapEntityPayload(response);
      const row = asRecord(data);
      if (row) return row as unknown as Application;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function submitRenewalApplication(
  apiFetch: ApiFetch,
  payload: CreateRenewalApplicationRequest,
): Promise<{ renewalApplicationId: string; applicationNumber?: string }> {
  const response = await requestJson<unknown>(
    apiFetch,
    RENEWAL_ENDPOINTS.create(payload.module),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'renewal-create',
  );
  const data = unwrapEntityPayload(response);
  const row = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return {
    renewalApplicationId: String(row._id ?? row.renewalApplicationId ?? ''),
    applicationNumber: row.applicationNumber ? String(row.applicationNumber) : undefined,
  };
}

/**
 * Returns true when another in-force motor policy exists for this plate.
 * The original (expired) application is excluded. If the backend endpoint is
 * missing, returns null so the caller can fall back to list flags / dates.
 */
export async function plateHasActiveMotorInsurance(
  apiFetch: ApiFetch,
  plateNumber: string,
  excludeApplicationId?: string,
): Promise<boolean | null> {
  const plate = plateNumber.trim();
  if (!plate) return false;
  try {
    const response = await requestJson<unknown>(
      apiFetch,
      RENEWAL_ENDPOINTS.activeMotorByPlate(plate, excludeApplicationId),
      { method: 'GET' },
      'renewals-list',
    );
    const data = unwrapEntityPayload(response);
    const row = asRecord(data) ?? asRecord(response);
    if (!row) return false;
    const activeId = String(row.applicationId ?? row._id ?? '');
    if (excludeApplicationId && activeId && activeId === excludeApplicationId) {
      return isPolicyExpired(String(row.insuranceEndAt ?? row.policyEndDate ?? ''))
        ? false
        : Boolean(parseBooleanFlag(row.hasActiveInsurance) ?? true);
    }
    const flagged = parseBooleanFlag(
      row.hasActiveInsurance ?? row.hasActiveInsuranceForPlate ?? row.active,
    );
    if (flagged === false) return false;
    if (flagged === true) return true;
    const end = String(row.insuranceEndAt ?? row.policyEndDate ?? '');
    if (end) return !isPolicyExpired(end);
    return Boolean(activeId);
  } catch {
    return null;
  }
}
