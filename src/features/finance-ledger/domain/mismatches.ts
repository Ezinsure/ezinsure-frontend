import type {
  CurrencyCode,
  IsoDateTime,
  ActorRef,
  MoneyAmount,
  PageQuery,
  FinanceModule,
  PeriodFilter,
} from './common';

/** What kind of difference was found between our records and SONARWA's remittance. */
export const MISMATCH_KINDS = [
  'AMOUNT_DIFFERS',
  'MISSING_FROM_SONARWA',
  'NOT_IN_OUR_RECORDS',
] as const;
export type MismatchKind = (typeof MISMATCH_KINDS)[number];

export const MISMATCH_KIND_LABELS: Record<MismatchKind, string> = {
  AMOUNT_DIFFERS: 'Amount differs',
  MISSING_FROM_SONARWA: 'Billed, not paid by SONARWA',
  NOT_IN_OUR_RECORDS: 'Paid by SONARWA, not in our records',
};

export const MISMATCH_REASON_CODES = [
  'RATE_DIFFERENCE',
  'VAT_DIFFERENCE',
  'ROUNDING',
  'REJECTED_BY_SONARWA',
  'DUPLICATE',
  'CONTRACT_NOT_FOUND',
  'PAY_LATER',
  'OTHER',
] as const;
export type MismatchReasonCode = (typeof MISMATCH_REASON_CODES)[number];

export const MISMATCH_REASON_LABELS: Record<MismatchReasonCode, string> = {
  RATE_DIFFERENCE: 'Commission rate / calculation difference',
  VAT_DIFFERENCE: 'VAT difference',
  ROUNDING: 'Rounding',
  REJECTED_BY_SONARWA: 'Rejected by SONARWA',
  DUPLICATE: 'Duplicate',
  CONTRACT_NOT_FOUND: 'Contract not found',
  PAY_LATER: 'SONARWA will pay later',
  OTHER: 'Other (note required)',
};

export const MISMATCH_STATUSES = [
  'OPEN',
  'EXPLAINED',
  'REBILL',
  'WRITTEN_OFF',
] as const;
export type MismatchStatus = (typeof MISMATCH_STATUSES)[number];

export const MISMATCH_STATUS_LABELS: Record<MismatchStatus, string> = {
  OPEN: 'Open',
  EXPLAINED: 'Explained',
  REBILL: 'Rebill',
  WRITTEN_OFF: 'Written off',
};

export const MISMATCH_RESOLUTION_ACTIONS = [
  'EXPLAIN',
  'REBILL',
  'WRITE_OFF',
] as const;
export type MismatchResolutionAction = (typeof MISMATCH_RESOLUTION_ACTIONS)[number];

export interface Mismatch {
  id: string;
  module: FinanceModule;
  kind: MismatchKind;
  status: MismatchStatus;
  currency: CurrencyCode;
  statementId: string;
  statementNumber: string;
  receiptId?: string;
  /** Absent for `NOT_IN_OUR_RECORDS`. */
  lineId?: string;
  contractNumber: string;
  vetName?: string;
  /** What we recorded (0 when the line is not in our records). */
  expectedAmount: MoneyAmount;
  /** What SONARWA paid for it (0 when missing from their remittance). */
  sonarwaAmount: MoneyAmount;
  /** `sonarwaAmount - expectedAmount`; negative means SONARWA paid less. */
  differenceAmount: MoneyAmount;
  reasonCode?: MismatchReasonCode;
  note?: string;
  createdAt: IsoDateTime;
  resolvedAt?: IsoDateTime;
  resolvedBy?: ActorRef;
}

export interface MismatchesQuery extends PageQuery {
  module: FinanceModule;
  status?: MismatchStatus | MismatchStatus[];
  kind?: MismatchKind;
  statementId?: string;
  vetId?: string;
  /** Applied to `createdAt` unless `by` says otherwise. */
  period?: PeriodFilter;
  search?: string;
}

export interface ResolveMismatchInput {
  action: MismatchResolutionAction;
  reasonCode: MismatchReasonCode;
  /** Required when `reasonCode` is `OTHER`; always recommended. */
  note?: string;
}
