/**
 * External vet commission tracking — isolated from LivestockApplication.
 * Document column labels (UI) map to camelCase API fields below.
 */

export const EXTERNAL_VET_COMMISSION_STATUSES = [
  'PENDING_ADMIN_REVIEW',
  'READY_TO_BE_PAID',
  'PAYMENT_INITIATED',
  'PAID',
  'REJECTED',
] as const;

export type ExternalVetCommissionStatus =
  (typeof EXTERNAL_VET_COMMISSION_STATUSES)[number];

export type ExternalVetsHubTab =
  | 'overview'
  | 'applications'
  | 'admin-review'
  | 'payments'
  | 'initiated'
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
 * sumInsured→SumInsured, netPremium→NetPremium, commission→Commission,
 * userName→UserName
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
  commission: number;
  userName: string;
};

export type ExternalVetCommissionBatch = {
  id: string;
  batchNumber: string;
  status: ExternalVetCommissionStatus;
  externalVetId: string;
  payee: ExternalVetPayeeSnapshot;
  periodLabel?: string;
  sourceFileName: string;
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
  commission: 'Commission',
  userName: 'UserName',
};

/** Document column order (matches SONARWA commission sheet). */
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
  'commission',
  'userName',
] as const satisfies ReadonlyArray<keyof Omit<ExternalVetCommissionLine, 'id'>>;

export type CommissionLineColumnKey = (typeof COMMISSION_LINE_COLUMN_KEYS)[number];

export function formatCommissionLineCell(
  line: Omit<ExternalVetCommissionLine, 'id'> | ExternalVetCommissionLine,
  key: CommissionLineColumnKey,
): string {
  const value = line[key];
  if (key === 'sumInsured' || key === 'netPremium' || key === 'commission') {
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
  REJECTED: 'Rejected',
};

export function formatRwf(value: number): string {
  return `${Math.round(value).toLocaleString()} RWF`;
}
