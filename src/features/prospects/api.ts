import type {
  CreateProspectPayload,
  Prospect,
  ProspectListFilters,
  ProspectListResult,
  ProspectSmsReminderStatus,
  UpdateProspectPayload,
} from '@/features/prospects/types';

type ApiFetch = (path: string, options?: RequestInit) => Promise<Response>;

export const PROSPECT_ENDPOINTS = {
  list: (filters?: ProspectListFilters): string => {
    const search = new URLSearchParams();
    if (filters?.startDate) search.set('startDate', filters.startDate);
    if (filters?.endDate) search.set('endDate', filters.endDate);
    if (filters?.search?.trim()) search.set('search', filters.search.trim());
    if (filters?.smsReminderStatus && filters.smsReminderStatus !== 'all') {
      search.set('smsReminderStatus', filters.smsReminderStatus);
    }
    if (filters?.agentId) search.set('agentId', filters.agentId);
    if (filters?.bucket && filters.bucket !== 'all') search.set('bucket', filters.bucket);
    const qs = search.toString();
    return qs ? `/getProspects?${qs}` : '/getProspects';
  },
  create: (): string => '/createProspect',
  update: (id: string): string => `/updateProspect/${encodeURIComponent(id)}`,
  remove: (id: string): string => `/deleteProspect/${encodeURIComponent(id)}`,
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
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

function daysUntil(dateIso: string): number | undefined {
  if (!dateIso) return undefined;
  const end = new Date(dateIso.slice(0, 10));
  if (Number.isNaN(end.getTime())) return undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function normalizeSmsStatus(value: unknown): ProspectSmsReminderStatus {
  const raw = String(value ?? 'pending').toLowerCase().replace(/\s+/g, '_');
  if (
    raw === 'pending' ||
    raw === 'scheduled' ||
    raw === 'sent' ||
    raw === 'failed' ||
    raw === 'not_applicable'
  ) {
    return raw;
  }
  if (raw === 'notapplicable' || raw === 'n/a' || raw === 'na') return 'not_applicable';
  return 'pending';
}

function mapAgent(row: Record<string, unknown>) {
  const agent = asRecord(row.agent) ?? asRecord(row.createdBy);
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

export function mapProspectRow(row: Record<string, unknown>): Prospect {
  const expiry = String(
    row.insuranceExpiryDate ?? row.expiryDate ?? row.policyEndDate ?? row.endDate ?? '',
  );
  const agent = mapAgent(row);
  return {
    _id: String(row._id ?? row.id ?? ''),
    phoneNumber: String(
      firstNonEmpty(row.phoneNumber, row.phone, row.mobile) ?? '',
    ),
    insuranceExpiryDate: expiry,
    fullName: firstNonEmpty(row.fullName, row.clientName, row.name),
    currentInsurer: firstNonEmpty(row.currentInsurer, row.insurer, row.otherProvider),
    insuranceCategory: firstNonEmpty(row.insuranceCategory, row.category),
    notes: firstNonEmpty(row.notes, row.comment),
    agent,
    agentId: firstNonEmpty(row.agentId, agent?._id),
    smsReminderStatus: normalizeSmsStatus(
      row.smsReminderStatus ?? row.reminderStatus ?? row.smsStatus,
    ),
    lastSmsSentAt: firstNonEmpty(row.lastSmsSentAt, row.smsSentAt),
    smsFailureReason: firstNonEmpty(row.smsFailureReason, row.smsError),
    createdAt: firstNonEmpty(row.createdAt),
    updatedAt: firstNonEmpty(row.updatedAt),
    daysUntilExpiry:
      row.daysUntilExpiry != null && Number.isFinite(Number(row.daysUntilExpiry))
        ? Number(row.daysUntilExpiry)
        : daysUntil(expiry),
  };
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  const row = asRecord(payload);
  return String(row?.message ?? row?.error ?? fallback);
}

function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data;
  const nested = asRecord(root.data);
  if (nested && Array.isArray(nested.data)) return nested.data;
  if (Array.isArray(root.prospects)) return root.prospects;
  if (Array.isArray(root.items)) return root.items;
  return [];
}

export async function fetchProspects(
  apiFetch: ApiFetch,
  filters?: ProspectListFilters,
): Promise<ProspectListResult> {
  const response = await apiFetch(PROSPECT_ENDPOINTS.list(filters), { method: 'GET' });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, 'Failed to load prospects.'));
  }
  const rows = unwrapList(payload)
    .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
    .map(mapProspectRow)
    .filter((p) => Boolean(p._id));
  const root = asRecord(payload);
  const nested = asRecord(root?.data);
  const count = Number(nested?.count ?? root?.count ?? rows.length);
  return { items: rows, count: Number.isFinite(count) ? count : rows.length };
}

export async function createProspect(
  apiFetch: ApiFetch,
  body: CreateProspectPayload,
): Promise<Prospect> {
  const response = await apiFetch(PROSPECT_ENDPOINTS.create(), {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, 'Failed to create prospect.'));
  }
  const data = asRecord(asRecord(payload)?.data) ?? asRecord(payload) ?? {};
  return mapProspectRow(data);
}

export async function updateProspect(
  apiFetch: ApiFetch,
  id: string,
  body: UpdateProspectPayload,
): Promise<Prospect> {
  const response = await apiFetch(PROSPECT_ENDPOINTS.update(id), {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, 'Failed to update prospect.'));
  }
  const data = asRecord(asRecord(payload)?.data) ?? asRecord(payload) ?? {};
  return mapProspectRow(data);
}

export async function deleteProspect(apiFetch: ApiFetch, id: string): Promise<void> {
  const response = await apiFetch(PROSPECT_ENDPOINTS.remove(id), { method: 'DELETE' });
  if (!response.ok) {
    const payload = await readJson(response);
    throw new Error(extractErrorMessage(payload, 'Failed to delete prospect.'));
  }
}
