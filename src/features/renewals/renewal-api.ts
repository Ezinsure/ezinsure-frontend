/**
 * Shared renewal API helpers for Motor and Livestock.
 *
 * POST /createRenewalApplication/{module} now accepts a full edited application
 * payload. The backend must recalculate discount and commissions and must not
 * trust frontend-calculated amounts.
 */
import type { Application } from '@/features/admin-motor-applications/types';
import type { CreateLivestockApplicationPayload } from '@/features/livestock-application/domain/application-types';
import type { ApiFetch } from '@/features/livestock-application/api/http';
import { requestJson, unwrapEntityPayload } from '@/features/livestock-application/api/http';
import {
  computeRenewalPricing,
  type RenewalPricingBreakdown,
} from '@/features/renewals/renewal-pricing';

export type RenewalModule = 'motor' | 'livestock';

export interface RenewingApplicationSummary {
  _id: string;
  applicationNumber: string;
  clientName: string;
  phone?: string;
  email?: string;
  policyEndDate: string;
  netPremium: number;
  agentCommission: number;
  module: RenewalModule;
  plateNumber?: string;
  speciesGroup?: string;
  daysUntilExpiry?: number;
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
  listExpiring: (module: RenewalModule, startDate: string, endDate: string): string => {
    const search = new URLSearchParams({ startDate, endDate, module });
    return `/getApplicationsEligibleForRenewal?${search.toString()}`;
  },
  preview: (module: RenewalModule, applicationId: string): string =>
    `/getRenewalPreview/${encodeURIComponent(module)}/${encodeURIComponent(applicationId)}`,
  create: (module: RenewalModule): string => `/createRenewalApplication/${module}`,
  motorApplicationById: (applicationId: string): string =>
    `/getMotorApplicationById/${encodeURIComponent(applicationId)}`,
  motorApplicationByIdFallback: (applicationId: string): string =>
    `/getApplicationById/${encodeURIComponent(applicationId)}`,
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

function mapRenewalRow(row: Record<string, unknown>, module: RenewalModule): RenewingApplicationSummary {
  const client = nestedRecord(row.client);
  const vehicle = nestedRecord(row.vehicle);
  const policyEndDate = String(row.policyEndDate ?? row.insuranceEndAt ?? row.endDate ?? '');
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
    module,
    plateNumber: firstNonEmpty(row.plateNumber, vehicle?.plateNumber),
    speciesGroup: row.speciesGroup ? String(row.speciesGroup) : undefined,
    daysUntilExpiry: policyEndDate ? daysUntil(policyEndDate) : undefined,
  };
}

export async function fetchRenewalEligibleApplications(
  apiFetch: ApiFetch,
  module: RenewalModule,
  startDate: string,
  endDate: string,
): Promise<RenewingApplicationSummary[]> {
  try {
    const response = await requestJson<unknown>(
      apiFetch,
      RENEWAL_ENDPOINTS.listExpiring(module, startDate, endDate),
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
