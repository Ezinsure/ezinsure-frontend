import type { Application } from '@/features/admin-motor-applications/types';
import type {
  CompanyPerformanceApplication,
  CompanyPerformanceChannel,
  CompanyPerformanceResult,
  CompanyPerformanceTotals,
} from '@/features/company-performance/types';

function parseAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const normalized = String(value ?? '')
    .replace(/\s/g, '')
    .replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function extractApplicationRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const root = (payload ?? {}) as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data;

  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
    const nested = root.data as Record<string, unknown>;
    if (Array.isArray(nested.applications)) return nested.applications;
    if (Array.isArray(nested.data)) return nested.data;
    if (Array.isArray(nested.items)) return nested.items;
  }

  if (Array.isArray(root.applications)) return root.applications;
  if (Array.isArray(root.items)) return root.items;

  return [];
}

function resolveChannel(raw: Record<string, unknown>): {
  channel: CompanyPerformanceChannel;
  channelLabel: string;
  performerName: string;
} {
  const admin = raw.admin as { fullName?: string } | null | undefined;

  if (admin?.fullName) {
    return {
      channel: 'admin',
      channelLabel: 'Admin',
      performerName: String(admin.fullName).trim(),
    };
  }

  return {
    channel: 'client',
    channelLabel: 'Client',
    performerName: 'Self-service',
  };
}

export function normalizeCompanyPerformanceApplication(
  raw: unknown,
): CompanyPerformanceApplication {
  const record = (raw ?? {}) as Record<string, unknown>;
  const client = record.client as { fullName?: string } | null | undefined;
  const channel = resolveChannel(record);
  const application = record as unknown as Application;

  return {
    _id: String(record._id ?? record.id ?? ''),
    applicationNumber: String(record.applicationNumber ?? record.application_number ?? '—'),
    clientName: String(
      client?.fullName ?? record.fullName ?? record.clientName ?? '—',
    ).trim(),
    channel: channel.channel,
    channelLabel: channel.channelLabel,
    performerName: channel.performerName,
    insuranceCategory: String(record.insuranceCategory ?? '—'),
    status: String(record.status ?? ''),
    amount: parseAmount(record.amount ?? record.netPremium),
    companyCommission: parseAmount(record.companyCommission),
    administrationFees: parseAmount(record.administrationFees),
    submittedAt: String(record.submittedAt ?? record.submitted_at ?? ''),
    application,
  };
}

function computeTotalsFromApplications(
  applications: CompanyPerformanceApplication[],
): CompanyPerformanceTotals {
  return {
    applicationCount: applications.length,
    totalCompanyCommission: applications.reduce((sum, app) => sum + app.companyCommission, 0),
    totalAdministrationFees: applications.reduce((sum, app) => sum + app.administrationFees, 0),
  };
}

function readTotalsFromPayload(
  payload: unknown,
  fallback: CompanyPerformanceTotals,
): CompanyPerformanceTotals {
  const root = (payload ?? {}) as Record<string, unknown>;

  const applicationCount = Number(
    root.totalApplications ?? root.applicationCount ?? root.count ?? fallback.applicationCount,
  );
  const totalCompanyCommission = parseAmount(
    root.totalCompanyCommission ?? root.companyCommissionTotal ?? fallback.totalCompanyCommission,
  );
  const totalAdministrationFees = parseAmount(
    root.totalAdministrationFees ??
      root.administrationFeesTotal ??
      root.totalAdminFees ??
      fallback.totalAdministrationFees,
  );

  return {
    applicationCount: Number.isFinite(applicationCount) ? applicationCount : fallback.applicationCount,
    totalCompanyCommission,
    totalAdministrationFees,
  };
}

export function parseCompanyPerformanceResponse(payload: unknown): CompanyPerformanceResult {
  const applications = extractApplicationRows(payload).map(normalizeCompanyPerformanceApplication);
  const fallbackTotals = computeTotalsFromApplications(applications);
  const totals = readTotalsFromPayload(payload, fallbackTotals);

  return {
    applications,
    totals,
    rawPayload: payload,
  };
}

export async function fetchCompanyPerformanceApplications(
  token: string,
  startDate: string,
  endDate: string,
): Promise<CompanyPerformanceResult> {
  const search = new URLSearchParams({ startDate, endDate });
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/getAllAdminAndClientApplications?${search.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    let message = `Failed to load company performance data (${response.status})`;
    try {
      const errorBody = await response.json();
      message = String(errorBody.message ?? errorBody.error ?? message);
    } catch {
      try {
        const text = await response.text();
        if (text.trim()) message = text;
      } catch {
        // keep default message
      }
    }
    throw new Error(message);
  }

  const payload = await response.json();
  return parseCompanyPerformanceResponse(payload);
}
