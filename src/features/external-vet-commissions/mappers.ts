import type {
  ExternalVetCommissionBatch,
  ExternalVetCommissionBatchSummary,
  ExternalVetCommissionLine,
  ExternalVetCommissionStatus,
  ExternalVetPayeeSnapshot,
  ExternalVetPerformanceRow,
  ExternalVetsOverviewStats,
} from './domain';
import { EXTERNAL_VET_COMMISSION_STATUSES, DEFAULT_COMPANY_COMMISSION_PERCENT } from './domain';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function pickId(raw: Record<string, unknown>): string {
  const id = raw.id ?? raw._id;
  return id == null ? '' : String(id);
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  return String(value);
}

function asOptionalString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
}

/** Accept array, `{ data: [] }`, `{ batches: [] }`, `{ items: [] }`. */
export function normalizeList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  if (Array.isArray(root.data)) return root.data;
  if (Array.isArray(root.batches)) return root.batches;
  if (Array.isArray(root.items)) return root.items;
  if (Array.isArray(root.results)) return root.results;
  const nested = asRecord(root.data);
  if (Array.isArray(nested.batches)) return nested.batches;
  if (Array.isArray(nested.items)) return nested.items;
  return [];
}

/**
 * Backend stores payee as flat fields (payeeName, payeePhoneNumber, …).
 * Also accept nested `payee` if present.
 */
function mapPayee(raw: unknown): ExternalVetPayeeSnapshot {
  const row = asRecord(raw);
  if (row.payee && typeof row.payee === 'object') {
    const payee = asRecord(row.payee);
    return {
      name: asString(payee.name ?? payee.fullName, '—'),
      phoneNumber: asString(payee.phoneNumber),
      bankName: asOptionalString(payee.bankName),
      bankAccountNumber: asOptionalString(payee.bankAccountNumber),
    };
  }

  return {
    name: asString(row.payeeName ?? row.vetName ?? row.name, '—'),
    phoneNumber: asString(row.payeePhoneNumber ?? row.phoneNumber),
    bankName: asOptionalString(row.payeeBankName ?? row.bankName),
    bankAccountNumber: asOptionalString(
      row.payeeBankAccountNumber ?? row.bankAccountNumber,
    ),
  };
}

function mapStatus(value: unknown): ExternalVetCommissionStatus {
  const status = asString(value);
  if (
    (EXTERNAL_VET_COMMISSION_STATUSES as readonly string[]).includes(status)
  ) {
    return status as ExternalVetCommissionStatus;
  }
  return 'PENDING_ADMIN_REVIEW';
}

function mapLine(raw: unknown): ExternalVetCommissionLine {
  const row = asRecord(raw);
  return {
    id: pickId(row) || `line-${Math.random().toString(36).slice(2, 9)}`,
    sn: asNumber(row.sn, 0),
    prodDate: asString(row.prodDate),
    branch: asString(row.branch),
    effecDate: asString(row.effecDate),
    expiryDate: asString(row.expiryDate),
    contract: asString(row.contract),
    typeLivestock: asString(row.typeLivestock),
    clientId: asString(row.clientId),
    clientName: asString(row.clientName),
    agent: asString(row.agent),
    sumInsured: asNumber(row.sumInsured),
    netPremium: asNumber(row.netPremium),
    companyCommission: asNumber(
      row.companyCommission ?? row.commission,
    ),
    userName: asString(row.userName),
  };
}

export function mapBatchSummary(raw: unknown): ExternalVetCommissionBatchSummary {
  const row = asRecord(raw);
  return {
    id: pickId(row),
    batchNumber: asString(row.batchNumber, pickId(row) || '—'),
    status: mapStatus(row.status),
    externalVetId: asString(row.externalVetId),
    payee: mapPayee(row),
    periodLabel: asOptionalString(row.periodLabel),
    sourceFileName: asString(row.sourceFileName),
    companyCommissionPercent: asNumber(
      row.companyCommissionPercent ?? row.commissionPercent,
      DEFAULT_COMPANY_COMMISSION_PERCENT,
    ),
    totalCommission: asNumber(
      row.totalCommission ?? row.totalCompanyCommission,
    ),
    lineCount: asNumber(row.lineCount),
    createdById: asString(row.createdById),
    createdByName: asString(row.createdByName),
    createdAt: asString(row.createdAt, new Date().toISOString()),
    reviewedById: asOptionalString(row.reviewedById),
    reviewedByName: asOptionalString(row.reviewedByName),
    reviewedAt: asOptionalString(row.reviewedAt),
    reviewNote: asOptionalString(row.reviewNote),
    paymentInitiatedAt: asOptionalString(row.paymentInitiatedAt),
    paidAt: asOptionalString(row.paidAt),
    paidById: asOptionalString(row.paidById),
    paidByName: asOptionalString(row.paidByName),
  };
}

export function mapBatch(raw: unknown): ExternalVetCommissionBatch {
  const row = asRecord(raw);
  const summary = mapBatchSummary(raw);
  const lines = Array.isArray(row.lines) ? row.lines.map(mapLine) : [];
  const totalFromLines = lines.reduce(
    (sum, line) => sum + (line.companyCommission || 0),
    0,
  );
  return {
    ...summary,
    lines,
    lineCount: summary.lineCount || lines.length,
    totalCommission: summary.totalCommission || totalFromLines,
  };
}

export function mapOverview(raw: unknown): ExternalVetsOverviewStats {
  const row = asRecord(raw);
  const topRaw = row.topVets;
  return {
    pendingReviewCount: asNumber(row.pendingReviewCount),
    pendingReviewCommission: asNumber(row.pendingReviewCommission),
    readyToPayCount: asNumber(row.readyToPayCount),
    readyToPayCommission: asNumber(row.readyToPayCommission),
    initiatedCount: asNumber(row.initiatedCount),
    initiatedCommission: asNumber(row.initiatedCommission),
    paidYtdCount: asNumber(row.paidYtdCount),
    paidYtdCommission: asNumber(row.paidYtdCommission),
    externalVetCount: asNumber(row.externalVetCount),
    topVets: Array.isArray(topRaw) ? topRaw.map(mapPerformanceRow) : [],
  };
}

export function mapPerformanceRow(raw: unknown): ExternalVetPerformanceRow {
  const row = asRecord(raw);
  return {
    externalVetId: asString(row.externalVetId ?? row.id ?? row._id),
    name: asString(row.name, '—'),
    phoneNumber: asString(row.phoneNumber),
    batchCount: asNumber(row.batchCount),
    totalCommission: asNumber(row.totalCommission),
    pendingCommission: asNumber(row.pendingCommission),
    readyCommission: asNumber(row.readyCommission),
    paidCommission: asNumber(row.paidCommission),
  };
}
