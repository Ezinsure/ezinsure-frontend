/**
 * External vet commission tracking — isolated from LivestockApplication.
 * Document column labels (UI) map to camelCase API fields below.
 */

export const EXTERNAL_VET_COMMISSION_STATUSES = [
  'PENDING_ADMIN_REVIEW',
  'READY_TO_BE_PAID',
  'PAYMENT_INITIATED',
  'PAID',
  'AWAITING_SONARWA_REIMBURSEMENT',
  'REIMBURSED_BY_SONARWA',
  'REJECTED',
] as const;

export type ExternalVetCommissionStatus =
  (typeof EXTERNAL_VET_COMMISSION_STATUSES)[number];

/** Post-payout statuses used on the finance Lines (SONARWA reclaim) workspace. */
export const EXTERNAL_VET_REIMBURSEMENT_STATUSES = [
  'PAID',
  'AWAITING_SONARWA_REIMBURSEMENT',
  'REIMBURSED_BY_SONARWA',
] as const;

export type ExternalVetReimbursementStatus =
  (typeof EXTERNAL_VET_REIMBURSEMENT_STATUSES)[number];

/**
 * Statuses available on the Lines tab (pre-payment validation + reclaim).
 * Finance exports Ready-to-pay lines before initiating payment.
 */
export const EXTERNAL_VET_LINES_WORKSPACE_STATUSES = [
  'READY_TO_BE_PAID',
  'PAID',
  'AWAITING_SONARWA_REIMBURSEMENT',
  'REIMBURSED_BY_SONARWA',
] as const;

export type ExternalVetLinesWorkspaceStatus =
  (typeof EXTERNAL_VET_LINES_WORKSPACE_STATUSES)[number];

export type ExternalVetsHubTab =
  | 'overview'
  | 'applications'
  | 'admin-review'
  | 'payments'
  | 'initiated'
  | 'lines'
  | 'history';

export type ExternalVetsViewRole = 'admin' | 'super_admin' | 'finance';

/** Registry payee — not a login user. */
export type ExternalVet = {
  id: string;
  name: string;
  phoneNumber: string;
  district?: string;
  sector?: string;
  /** Optional when a phone / MoMo number is provided. */
  bankName?: string;
  bankAccountNumber?: string;
  linkedUserId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

/** Frozen payout snapshot on the batch at submit / review time. */
export type ExternalVetPayeeSnapshot = {
  name: string;
  phoneNumber: string;
  district: string;
  sector: string;
  /** Date the vet requested commission (claim-form section 1). */
  commissionRequestDate: string;
  /** Optional when phone / MoMo is provided. */
  bankName?: string;
  bankAccountNumber?: string;
};

/** Fixed VAT rate applied to total commission for SONARWA reclaim billing. */
export const SONARWA_VAT_RATE = 0.18;

/** Vet + company commission claimed on a line (usual case ≈ 13.5% of net). */
export function calcTotalCommission(
  vetCommission: number,
  companyCommission: number,
): number {
  return Math.round((vetCommission || 0) + (companyCommission || 0));
}

export function calcVatOnTotalCommission(totalCommission: number): number {
  return Math.round((totalCommission || 0) * SONARWA_VAT_RATE);
}

/** Amount to bill SONARWA = total commission + VAT. */
export function calcBillableToSonarwa(totalCommission: number): number {
  return totalCommission + calcVatOnTotalCommission(totalCommission);
}

export type ReclaimMoneyBreakdown = {
  totalVetCommission: number;
  totalCompanyCommission: number;
  totalCommission: number;
  vat: number;
  billableToSonarwa: number;
};

export function calcReclaimBreakdown(
  vetCommission: number,
  companyCommission: number,
): ReclaimMoneyBreakdown {
  const totalCommission = calcTotalCommission(vetCommission, companyCommission);
  const vat = calcVatOnTotalCommission(totalCommission);
  return {
    totalVetCommission: Math.round(vetCommission || 0),
    totalCompanyCommission: Math.round(companyCommission || 0),
    totalCommission,
    vat,
    billableToSonarwa: totalCommission + vat,
  };
}

/**
 * One row of section 2 of the commission claim form. Column headers arrive in
 * Kinyarwanda or English and are normalised on upload — see
 * `commission-sheet-schema.ts` for the accepted spellings.
 *
 * companyCommission is NOT in the sheet — computed from netPremium × rate.
 */
export type ExternalVetCommissionLine = {
  id: string;
  /** Display-only row counter; the sheet's "N°" column is never sent to the API. */
  sn: number;
  microchipNumber: string;
  prodDate: string;
  branch: string;
  effecDate: string;
  expiryDate: string;
  contract: string;
  typeLivestock: string;
  clientId: string;
  clientName: string;
  clientDistrict: string;
  clientSector: string;
  sumInsured: number;
  netPremium: number;
  /** Agent/vet commission claimed on this contract. */
  vetCommission: number;
  /** netPremium × (companyCommissionPercent / 100). */
  companyCommission: number;
  /** Legacy SONARWA export columns; absent from the current claim form. */
  agent?: string;
  userName?: string;
};

/** Default company commission rate (% of net premium). */
export const DEFAULT_COMPANY_COMMISSION_PERCENT = 3.5;

export function calcCompanyCommission(
  netPremium: number,
  percent: number,
): number {
  if (!Number.isFinite(netPremium) || !Number.isFinite(percent)) return 0;
  return Math.round(netPremium * (percent / 100));
}

export type ExternalVetCommissionBatch = {
  id: string;
  batchNumber: string;
  status: ExternalVetCommissionStatus;
  externalVetId: string;
  payee: ExternalVetPayeeSnapshot;
  periodLabel?: string;
  sourceFileName: string;
  /**
   * Stored claim-form workbook so admin/finance can re-open the original upload.
   * Prefer `sourceDocumentUrl`; `sourceDocument` is accepted as an alias.
   */
  sourceDocumentUrl?: string;
  sourceDocumentName?: string;
  /** % of net premium used to compute companyCommission (e.g. 3.5). */
  companyCommissionPercent: number;
  /** Sum of line vetCommission. */
  totalVetCommission: number;
  /** Sum of line companyCommission. */
  totalCompanyCommission: number;
  /**
   * Primary payout total sent/returned by API.
   * Prefer totalCompanyCommission when both exist; maps legacy totalCommission.
   */
  totalCommission: number;
  lineCount: number;
  lines: ExternalVetCommissionLine[];
  createdById: string;
  createdByName: string;
  createdAt: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  paymentInitiatedAt?: string;
  paidAt?: string;
  paidById?: string;
  paidByName?: string;
  /** When finance prepared the SONARWA reclaim file. */
  awaitingSonarwaReimbursementAt?: string;
  exportReference?: string;
  /** When SONARWA reimbursed Solektra. */
  reimbursedBySonarwaAt?: string;
  reimbursementReference?: string;
};

/**
 * Flat commission line with batch context for the Lines / reclaim workspace.
 * Status remains on the parent batch; lines are the selection surface.
 */
export type ExternalVetCommissionLineListItem = ExternalVetCommissionLine & {
  batchId: string;
  batchNumber: string;
  batchStatus: ExternalVetCommissionStatus;
  externalVetId: string;
  payee: ExternalVetPayeeSnapshot;
  periodLabel?: string;
  batchCreatedAt: string;
  paidAt?: string;
};

export type ExternalVetCommissionLinesSummary = {
  lineCount: number;
  batchCount: number;
  vetCount: number;
  totalVetCommission: number;
  totalCompanyCommission: number;
  /** vet + company */
  totalCommission: number;
  /** 18% of totalCommission */
  vat: number;
  /** totalCommission + VAT — amount billed to SONARWA */
  billableToSonarwa: number;
};

export type ExternalVetCommissionLinesResult = {
  lines: ExternalVetCommissionLineListItem[];
  summary: ExternalVetCommissionLinesSummary;
};

export type MarkAwaitingSonarwaReimbursementInput = {
  batchIds: string[];
  exportReference?: string;
};

export type MarkReimbursedBySonarwaInput = {
  batchIds: string[];
  reimbursedAt?: string;
  reimbursementReference?: string;
};

/** List row without full line payload. */
export type ExternalVetCommissionBatchSummary = Omit<
  ExternalVetCommissionBatch,
  'lines'
>;

export type ExternalVetPerformanceRow = {
  externalVetId: string;
  name: string;
  phoneNumber: string;
  batchCount: number;
  totalCommission: number;
  pendingCommission: number;
  readyCommission: number;
  paidCommission: number;
};

export type ExternalVetsOverviewStats = {
  pendingReviewCount: number;
  pendingReviewCommission: number;
  readyToPayCount: number;
  readyToPayCommission: number;
  initiatedCount: number;
  initiatedCommission: number;
  paidYtdCount: number;
  paidYtdCommission: number;
  externalVetCount: number;
  topVets: ExternalVetPerformanceRow[];
};

export type CreateExternalVetInput = {
  name: string;
  phoneNumber: string;
  district?: string;
  sector?: string;
  bankName?: string;
  bankAccountNumber?: string;
  linkedUserId?: string;
};

export type CreateCommissionBatchInput = {
  externalVetId: string;
  payee: ExternalVetPayeeSnapshot;
  periodLabel: string;
  sourceFileName: string;
  /** Original claim-form workbook (multipart field `sourceDocument`). */
  sourceFile: File;
  /** % of net premium used for companyCommission (e.g. 3.5). */
  companyCommissionPercent: number;
  lines: Omit<ExternalVetCommissionLine, 'id'>[];
};

export type PlatformVetSearchHit = {
  userId: string;
  fullName: string;
  phoneNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  email?: string;
};

/**
 * Line column order for UI previews, detail tables and exports. Mirrors the
 * claim form left-to-right, with the derived company commission appended.
 */
export const COMMISSION_LINE_COLUMN_KEYS = [
  'sn',
  'microchipNumber',
  'prodDate',
  'branch',
  'effecDate',
  'expiryDate',
  'contract',
  'typeLivestock',
  'clientId',
  'clientName',
  'clientDistrict',
  'clientSector',
  'sumInsured',
  'netPremium',
  'vetCommission',
  'companyCommission',
] as const satisfies ReadonlyArray<keyof Omit<ExternalVetCommissionLine, 'id'>>;

export type CommissionLineColumnKey = (typeof COMMISSION_LINE_COLUMN_KEYS)[number];

/** English labels shown for every claim-form column, whatever the upload language. */
export const COMMISSION_LINE_COLUMN_LABELS: Record<
  CommissionLineColumnKey,
  string
> = {
  sn: 'N°',
  microchipNumber: 'Microchip / Tag number',
  prodDate: 'Production date',
  branch: 'Branch / production district',
  effecDate: 'Effective date',
  expiryDate: 'Expiry date',
  contract: 'Contract number',
  typeLivestock: 'Livestock type',
  clientId: 'Client ID',
  clientName: 'Client name',
  clientDistrict: 'Client district',
  clientSector: 'Client sector',
  sumInsured: 'Sum insured (RWF)',
  netPremium: 'Net premium (RWF)',
  vetCommission: 'Agent commission (RWF)',
  companyCommission: 'Company commission (RWF)',
};

export function formatCommissionLineCell(
  line: Omit<ExternalVetCommissionLine, 'id'> | ExternalVetCommissionLine,
  key: CommissionLineColumnKey,
): string {
  const value = line[key];
  if (
    key === 'sumInsured' ||
    key === 'netPremium' ||
    key === 'vetCommission' ||
    key === 'companyCommission'
  ) {
    return formatRwf(Number(value));
  }
  return String(value ?? '');
}

export const EXTERNAL_VET_STATUS_LABELS: Record<
  ExternalVetCommissionStatus,
  string
> = {
  PENDING_ADMIN_REVIEW: 'Pending review',
  READY_TO_BE_PAID: 'Ready to pay',
  PAYMENT_INITIATED: 'Payment initiated',
  PAID: 'Paid',
  AWAITING_SONARWA_REIMBURSEMENT: 'Awaiting reimbursement',
  REIMBURSED_BY_SONARWA: 'Reimbursed',
  REJECTED: 'Rejected',
};

export function isReimbursementStatus(
  status: ExternalVetCommissionStatus,
): status is ExternalVetReimbursementStatus {
  return (EXTERNAL_VET_REIMBURSEMENT_STATUSES as readonly string[]).includes(
    status,
  );
}

export function summarizeCommissionLines(
  lines: ExternalVetCommissionLineListItem[],
): ExternalVetCommissionLinesSummary {
  const batchIds = new Set<string>();
  const vetIds = new Set<string>();
  let totalVetCommission = 0;
  let totalCompanyCommission = 0;
  for (const line of lines) {
    batchIds.add(line.batchId);
    vetIds.add(line.externalVetId);
    totalVetCommission += line.vetCommission || 0;
    totalCompanyCommission += line.companyCommission || 0;
  }
  const money = calcReclaimBreakdown(
    totalVetCommission,
    totalCompanyCommission,
  );
  return {
    lineCount: lines.length,
    batchCount: batchIds.size,
    vetCount: vetIds.size,
    totalVetCommission: money.totalVetCommission,
    totalCompanyCommission: money.totalCompanyCommission,
    totalCommission: money.totalCommission,
    vat: money.vat,
    billableToSonarwa: money.billableToSonarwa,
  };
}

export function formatRwf(value: number): string {
  return `${Math.round(value).toLocaleString()} RWF`;
}
