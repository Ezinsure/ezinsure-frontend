import type {
  ExternalVetCommissionBatch,
  ExternalVetCommissionBatchSummary,
  ExternalVetCommissionLine,
  ExternalVetCommissionLineListItem,
  ExternalVetCommissionLinesResult,
  ExternalVetCommissionStatus,
  ExternalVetPayeeSnapshot,
  ExternalVetPerformanceRow,
  ExternalVetsOverviewStats,
} from './domain';
import {
  EXTERNAL_VET_COMMISSION_STATUSES,
  DEFAULT_COMPANY_COMMISSION_PERCENT,
  summarizeCommissionLines,
} from './domain';

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
      district: asString(payee.district),
      sector: asString(payee.sector),
      commissionRequestDate: asString(
        payee.commissionRequestDate ?? payee.requestDate,
      ),
      bankName: asOptionalString(payee.bankName),
      bankAccountNumber: asOptionalString(payee.bankAccountNumber),
    };
  }

  return {
    name: asString(row.payeeName ?? row.vetName ?? row.name, '—'),
    phoneNumber: asString(row.payeePhoneNumber ?? row.phoneNumber),
    district: asString(row.payeeDistrict ?? row.district),
    sector: asString(row.payeeSector ?? row.sector),
    commissionRequestDate: asString(
      row.payeeCommissionRequestDate ??
        row.commissionRequestDate ??
        row.requestDate,
    ),
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

/**
 * `sn` is a display-only counter that is not persisted, so fall back to the
 * row's position within the batch.
 */
function mapLine(raw: unknown, index = 0): ExternalVetCommissionLine {
  const row = asRecord(raw);
  return {
    id: pickId(row) || `line-${Math.random().toString(36).slice(2, 9)}`,
    sn: asNumber(row.sn, index + 1) || index + 1,
    microchipNumber: asString(row.microchipNumber ?? row.tagNumber),
    prodDate: asString(row.prodDate),
    branch: asString(row.branch),
    effecDate: asString(row.effecDate),
    expiryDate: asString(row.expiryDate),
    contract: asString(row.contract),
    typeLivestock: asString(row.typeLivestock),
    clientId: asString(row.clientId),
    clientName: asString(row.clientName),
    clientDistrict: asString(row.clientDistrict),
    clientSector: asString(row.clientSector),
    sumInsured: asNumber(row.sumInsured),
    netPremium: asNumber(row.netPremium),
    // Prefer new fields on all fetch/mutate responses; legacy `commission` = vet only.
    vetCommission: asNumber(row.vetCommission ?? row.commission),
    companyCommission: asNumber(row.companyCommission),
    agent: asOptionalString(row.agent),
    userName: asOptionalString(row.userName),
  };
}

export function mapBatchSummary(raw: unknown): ExternalVetCommissionBatchSummary {
  const row = asRecord(raw);
  const totalVetCommission = asNumber(row.totalVetCommission);
  const totalCompanyCommission = asNumber(row.totalCompanyCommission);
  // Legacy batches may only have totalCommission (historically vet total).
  const legacyTotal = asNumber(row.totalCommission);
  const resolvedVet =
    totalVetCommission ||
    (row.totalVetCommission == null && row.totalCompanyCommission == null
      ? legacyTotal
      : 0);
  const resolvedCompany = totalCompanyCommission;
  return {
    id: pickId(row),
    batchNumber: asString(row.batchNumber, pickId(row) || '—'),
    status: mapStatus(row.status),
    externalVetId: asString(row.externalVetId),
    payee: mapPayee(row),
    periodLabel: asOptionalString(row.periodLabel),
    sourceFileName: asString(row.sourceFileName),
    sourceDocumentUrl: asOptionalString(
      row.sourceDocumentUrl ?? row.sourceDocument ?? row.documentUrl,
    ),
    sourceDocumentName: asOptionalString(
      row.sourceDocumentName ?? row.sourceFileName,
    ),
    companyCommissionPercent: asNumber(
      row.companyCommissionPercent ?? row.commissionPercent,
      DEFAULT_COMPANY_COMMISSION_PERCENT,
    ),
    totalVetCommission: resolvedVet,
    totalCompanyCommission: resolvedCompany,
    totalCommission: resolvedCompany || resolvedVet || legacyTotal,
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
    awaitingSonarwaReimbursementAt: asOptionalString(
      row.awaitingSonarwaReimbursementAt,
    ),
    exportReference: asOptionalString(row.exportReference),
    reimbursedBySonarwaAt: asOptionalString(row.reimbursedBySonarwaAt),
    reimbursementReference: asOptionalString(row.reimbursementReference),
  };
}

export function mapLineListItem(raw: unknown): ExternalVetCommissionLineListItem {
  const row = asRecord(raw);
  const line = mapLine(raw);
  const payee =
    row.payee || row.payeeName || row.batchId
      ? mapPayee(row)
      : {
          name: '—',
          phoneNumber: '',
          district: '',
          sector: '',
          commissionRequestDate: '',
        };

  return {
    ...line,
    batchId: asString(row.batchId ?? row.commissionBatchId),
    batchNumber: asString(row.batchNumber, '—'),
    batchStatus: mapStatus(row.batchStatus ?? row.status),
    externalVetId: asString(row.externalVetId),
    payee,
    periodLabel: asOptionalString(row.periodLabel),
    batchCreatedAt: asString(
      row.batchCreatedAt ?? row.createdAt,
      new Date().toISOString(),
    ),
    paidAt: asOptionalString(row.paidAt),
  };
}

/** Accept `{ lines, summary }`, `{ data: { lines, summary } }`, or a bare lines array. */
export function mapLinesResult(payload: unknown): ExternalVetCommissionLinesResult {
  const root = asRecord(payload);
  const nested = asRecord(root.data);
  const linesRaw = Array.isArray(root.lines)
    ? root.lines
    : Array.isArray(nested.lines)
      ? nested.lines
      : Array.isArray(root.data)
        ? root.data
        : Array.isArray(payload)
          ? payload
          : [];

  const lines = linesRaw.map(mapLineListItem);
  const summaryRaw = asRecord(root.summary ?? nested.summary);
  const computed = summarizeCommissionLines(lines);

  return {
    lines,
    summary: {
      lineCount: asNumber(summaryRaw.lineCount, computed.lineCount),
      batchCount: asNumber(summaryRaw.batchCount, computed.batchCount),
      vetCount: asNumber(summaryRaw.vetCount, computed.vetCount),
      totalVetCommission: asNumber(
        summaryRaw.totalVetCommission,
        computed.totalVetCommission,
      ),
      totalCompanyCommission: asNumber(
        summaryRaw.totalCompanyCommission,
        computed.totalCompanyCommission,
      ),
      totalCommission: asNumber(
        summaryRaw.totalCommission,
        computed.totalCommission,
      ),
      vat: asNumber(summaryRaw.vat ?? summaryRaw.totalVat, computed.vat),
      billableToSonarwa: asNumber(
        summaryRaw.billableToSonarwa ?? summaryRaw.billableTotal,
        computed.billableToSonarwa,
      ),
    },
  };
}

export function linesFromBatch(
  batch: ExternalVetCommissionBatch,
): ExternalVetCommissionLineListItem[] {
  return (batch.lines ?? []).map((line) => ({
    ...line,
    batchId: batch.id,
    batchNumber: batch.batchNumber,
    batchStatus: batch.status,
    externalVetId: batch.externalVetId,
    payee: batch.payee,
    periodLabel: batch.periodLabel,
    batchCreatedAt: batch.createdAt,
    paidAt: batch.paidAt,
  }));
}

export function mapBatch(raw: unknown): ExternalVetCommissionBatch {
  const row = asRecord(raw);
  const summary = mapBatchSummary(raw);
  const lines = Array.isArray(row.lines)
    ? row.lines.map((line, index) => mapLine(line, index))
    : [];
  const totalVetFromLines = lines.reduce(
    (sum, line) => sum + (line.vetCommission || 0),
    0,
  );
  const totalCompanyFromLines = lines.reduce(
    (sum, line) => sum + (line.companyCommission || 0),
    0,
  );
  const totalVetCommission = summary.totalVetCommission || totalVetFromLines;
  const totalCompanyCommission =
    summary.totalCompanyCommission || totalCompanyFromLines;
  return {
    ...summary,
    lines,
    lineCount: summary.lineCount || lines.length,
    totalVetCommission,
    totalCompanyCommission,
    totalCommission: totalCompanyCommission || totalVetCommission,
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
