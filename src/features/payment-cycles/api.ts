import type {
  BiWeeklyCycle,
  PaymentCycleModule,
  PaymentCycleStatus,
  PaymentCycleSummary,
} from '@/features/payment-cycles/biweekly';
import { generateBiWeeklyCyclesForYear } from '@/features/payment-cycles/biweekly';

type ApiFetch = (path: string, options?: RequestInit) => Promise<Response>;

export interface PaymentCycleDateRange {
  startDate: string;
  endDate: string;
}

export interface CycleProducerRow {
  producerId: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  applicationsCount: number;
  totalCommission: number;
  netPremium?: number;
}

export interface CycleBreakdownResult {
  totalCommission: number;
  totalApplications: number;
  producerCount: number;
  producers: CycleProducerRow[];
  /** Inferred from filter / backend when available. */
  status: PaymentCycleStatus;
}

export const PAYMENT_CYCLE_ENDPOINTS = {
  /** Optional backend catalogue of cycles for a year + module. */
  list: (module: PaymentCycleModule, year: number): string =>
    `/getPaymentCycles?module=${encodeURIComponent(module)}&year=${year}`,
  /** Optional: persist / compute a specific cycle. */
  getById: (module: PaymentCycleModule, cycleId: string): string =>
    `/getPaymentCycle/${encodeURIComponent(module)}/${encodeURIComponent(cycleId)}`,
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

/**
 * Prefer backend cycle list when available; otherwise generate local bi-weekly
 * fortnights and leave status as `open` until breakdown is loaded.
 */
export async function fetchPaymentCycleCatalogue(
  apiFetch: ApiFetch,
  module: PaymentCycleModule,
  year: number,
): Promise<PaymentCycleSummary[]> {
  const local = generateBiWeeklyCyclesForYear(year).map(
    (cycle): PaymentCycleSummary => ({
      ...cycle,
      status: 'open',
      totalCommission: 0,
      totalApplications: 0,
      producerCount: 0,
    }),
  );

  try {
    const response = await apiFetch(PAYMENT_CYCLE_ENDPOINTS.list(module, year), {
      method: 'GET',
    });
    if (!response.ok) return local;
    const payload = await readJson(response);
    const root = asRecord(payload);
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(root?.data)
        ? root.data
        : Array.isArray(asRecord(root?.data)?.cycles)
          ? (asRecord(root?.data) as { cycles: unknown[] }).cycles
          : [];

    if (!rows.length) return local;

    const byId = new Map<string, PaymentCycleSummary>();
    for (const cycle of local) byId.set(cycle.id, cycle);

    for (const raw of rows) {
      const row = asRecord(raw);
      if (!row) continue;
      const id = String(row.id ?? row.cycleId ?? '');
      const base = byId.get(id);
      const startDate = String(row.startDate ?? base?.startDate ?? '');
      const endDate = String(row.endDate ?? base?.endDate ?? '');
      if (!startDate || !endDate) continue;
      const merged: PaymentCycleSummary = {
        id: id || `${year}-W${String(row.index ?? '').padStart(2, '0')}`,
        year: Number(row.year ?? year),
        index: Number(row.index ?? base?.index ?? 0),
        startDate,
        endDate,
        label: String(row.label ?? base?.label ?? `${startDate} – ${endDate}`),
        isCurrent: Boolean(row.isCurrent ?? base?.isCurrent),
        dayCount: Number(row.dayCount ?? base?.dayCount ?? 14),
        status: normalizeStatus(row.status),
        totalCommission: Number(row.totalCommission ?? 0),
        totalApplications: Number(row.totalApplications ?? 0),
        producerCount: Number(row.producerCount ?? row.agentCount ?? row.vetCount ?? 0),
        backendCycleId: row._id ? String(row._id) : undefined,
      };
      byId.set(merged.id, merged);
    }

    return Array.from(byId.values()).sort((a, b) => a.index - b.index);
  } catch {
    return local;
  }
}

function normalizeStatus(value: unknown): PaymentCycleStatus {
  const raw = String(value ?? 'open').toLowerCase();
  if (
    raw === 'open' ||
    raw === 'ready' ||
    raw === 'initiated' ||
    raw === 'paid' ||
    raw === 'partial' ||
    raw === 'empty'
  ) {
    return raw;
  }
  if (raw === 'payment_initiated' || raw === 'payment-initiated') return 'initiated';
  if (raw === 'ready_to_be_paid' || raw === 'ready-to-be-paid') return 'ready';
  return 'open';
}

export function inferCycleStatus(input: {
  totalApplications: number;
  readyCount?: number;
  initiatedCount?: number;
  paidCount?: number;
}): PaymentCycleStatus {
  const total = input.totalApplications;
  if (total <= 0) return 'empty';
  const paid = input.paidCount ?? 0;
  const initiated = input.initiatedCount ?? 0;
  const ready = input.readyCount ?? 0;
  if (paid === total) return 'paid';
  if (initiated === total) return 'initiated';
  if (ready === total) return 'ready';
  if (paid > 0 || initiated > 0 || ready > 0) return 'partial';
  return 'open';
}

export type { BiWeeklyCycle };
