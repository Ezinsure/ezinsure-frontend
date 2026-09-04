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
  /** Optional until finance needs payout details. */
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
  bankName?: string;
  bankAccountNumber?: string;
};

/**
 * One Excel row. API field → document header:
 * sn→S/N, prodDate→ProdDate, branch→Branch, effecDate→EffecDate,
 * expiryDate→ExpiryDate, contract→Contract, typeLivestock→Type Livestock,
 * clientId→ClientID, clientName→ClientName, agent→Agent,
 * sumInsured→SumInsured, netPremium→NetPremium, vetCommission→Commission,
 * userName→UserName.
 * companyCommission is NOT in the sheet — computed from netPremium × rate.
 */
export type ExternalVetCommissionLine = {
  id: string;
  sn: number;
  prodDate: string;
  branch: string;
  effecDate: string;
  expiryDate: string;
  contract: string;
  typeLivestock: string;
  clientId: string;
  clientName: string;
  agent: string;
  sumInsured: number;
  netPremium: number;
  /** From sheet Commission column (vet payout line amount). */
  vetCommission: number;
  /** netPremium × (companyCommissionPercent / 100). */
  companyCommission: number;
  userName: string;
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
  bankName?: string;
  bankAccountNumber?: string;
  linkedUserId?: string;
};

export type CreateCommissionBatchInput = {
  externalVetId: string;
  payee: ExternalVetPayeeSnapshot;
  periodLabel?: string;
  sourceFileName: string;
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

export const COMMISSION_LINE_COLUMN_LABELS: Record<
  keyof Omit<ExternalVetCommissionLine, 'id'>,
  string
> = {
  sn: 'S/N',
  prodDate: 'ProdDate',
  branch: 'Branch',
  effecDate: 'EffecDate',
  expiryDate: 'ExpiryDate',
  contract: 'Contract',
  typeLivestock: 'Type Livestock',
  clientId: 'ClientID',
  clientName: 'ClientName',
  agent: 'Agent',
  sumInsured: 'SumInsured',
  netPremium: 'NetPremium',
  vetCommission: 'VetCommission',
  companyCommission: 'CompanyCommission',
  userName: 'UserName',
};

/**
 * Columns expected in the uploaded Excel/CSV (and downloadable template).
 * Sheet still uses header "Commission" for vetCommission (SONARWA export).
 * companyCommission is intentionally excluded — set in the upload form.
 */
export const COMMISSION_SHEET_COLUMN_KEYS = [
  'sn',
  'prodDate',
  'branch',
  'effecDate',
  'expiryDate',
  'contract',
  'typeLivestock',
  'clientId',
  'clientName',
  'agent',
  'sumInsured',
  'netPremium',
  'vetCommission',
  'userName',
] as const satisfies ReadonlyArray<
  Exclude<keyof Omit<ExternalVetCommissionLine, 'id'>, 'companyCommission'>
>;

/** Sheet header labels (SONARWA uses "Commission" for vet commission). */
export const COMMISSION_SHEET_COLUMN_LABELS: Record<
  (typeof COMMISSION_SHEET_COLUMN_KEYS)[number],
  string
> = {
  sn: 'S/N',
  prodDate: 'ProdDate',
  branch: 'Branch',
  effecDate: 'EffecDate',
  expiryDate: 'ExpiryDate',
  contract: 'Contract',
  typeLivestock: 'Type Livestock',
  clientId: 'ClientID',
  clientName: 'ClientName',
  agent: 'Agent',
  sumInsured: 'SumInsured',
  netPremium: 'NetPremium',
  vetCommission: 'Commission',
  userName: 'UserName',
};

/** Full line column order for UI preview / detail tables. */
export const COMMISSION_LINE_COLUMN_KEYS = [
  'sn',
  'prodDate',
  'branch',
  'effecDate',
  'expiryDate',
  'contract',
  'typeLivestock',
  'clientId',
  'clientName',
  'agent',
  'sumInsured',
  'netPremium',
  'vetCommission',
  'companyCommission',
  'userName',
] as const satisfies ReadonlyArray<keyof Omit<ExternalVetCommissionLine, 'id'>>;

export type CommissionLineColumnKey = (typeof COMMISSION_LINE_COLUMN_KEYS)[number];

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
  PENDING_ADMIN_REVIEW: 'Pending admin review',
  READY_TO_BE_PAID: 'Ready to be paid',
  PAYMENT_INITIATED: 'Payment initiated',
  PAID: 'Paid',
  AWAITING_SONARWA_REIMBURSEMENT: 'Awaiting SONARWA reimbursement',
  REIMBURSED_BY_SONARWA: 'Reimbursed by SONARWA',
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
  return {
    lineCount: lines.length,
    batchCount: batchIds.size,
    vetCount: vetIds.size,
    totalVetCommission,
    totalCompanyCommission,
  };
}

export function formatRwf(value: number): string {
  return `${Math.round(value).toLocaleString()} RWF`;
}
