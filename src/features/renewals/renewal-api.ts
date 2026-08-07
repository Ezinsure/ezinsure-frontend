/**
 * Shared renewal API helpers for Motor and Livestock.
 * Endpoints below are the contracts for the backend team.
 */
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

export interface RenewalDetailsPayload {
  originalApplicationId: string;
  module: RenewalModule;
  discountAmount: number;
  expectedPaymentAmount: number;
  agentCommissionAfterDiscount: number;
  notes?: string;
}

export const RENEWAL_ENDPOINTS = {
  /** GET — applications eligible for renewal in a date window. */
  listExpiring: (module: RenewalModule, startDate: string, endDate: string): string => {
    const search = new URLSearchParams({ startDate, endDate, module });
    return `/getApplicationsEligibleForRenewal?${search.toString()}`;
  },
  /** GET — renewal preview for one application. */
  preview: (module: RenewalModule, applicationId: string): string =>
    `/getRenewalPreview/${encodeURIComponent(module)}/${encodeURIComponent(applicationId)}`,
  /** POST — create renewal application with stored discount details. */
  create: (module: RenewalModule): string => `/createRenewalApplication/${module}`,
} as const;

function daysUntil(dateIso: string): number {
  const end = new Date(dateIso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function mapRenewalRow(row: Record<string, unknown>, module: RenewalModule): RenewingApplicationSummary {
  const policyEndDate = String(
    row.policyEndDate ?? row.insuranceEndAt ?? row.endDate ?? '',
  );
  return {
    _id: String(row._id ?? row.id ?? ''),
    applicationNumber: String(row.applicationNumber ?? ''),
    clientName: String(row.clientName ?? row.ownerName ?? row.ownerSummary ?? '—'),
    phone: row.phone ? String(row.phone) : row.ownerPhone ? String(row.ownerPhone) : undefined,
    email: row.email ? String(row.email) : undefined,
    policyEndDate,
    netPremium: Number(row.netPremium ?? row.amount ?? row.farmerContributionAmount ?? 0),
    agentCommission: Number(row.agentCommission ?? row.veterinaryCommission ?? 0),
    module,
    plateNumber: row.plateNumber ? String(row.plateNumber) : undefined,
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
        ? ((data as { data: unknown[] }).data)
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

export async function submitRenewalApplication(
  apiFetch: ApiFetch,
  payload: RenewalDetailsPayload,
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
