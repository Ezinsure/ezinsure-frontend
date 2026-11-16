import type {
  ActorRef,
  CurrencyCode,
  DateOnly,
  FinanceModule,
  IsoDateTime,
  MoneyAmount,
  PageQuery,
  PeriodFilter,
} from './common';

export interface ReceiptAllocation {
  statementId: string;
  statementNumber?: string;
  amount: MoneyAmount;
}

/** A payment received from SONARWA, allocated to one or more statements. */
export interface Receipt {
  id: string;
  /** Human-readable, e.g. `RCP-2026-0012`. */
  receiptNumber: string;
  module: FinanceModule;
  currency: CurrencyCode;
  amount: MoneyAmount;
  receivedAt: DateOnly;
  /** SONARWA bank transfer / remittance reference. */
  reference: string;
  allocations: ReceiptAllocation[];
  remittanceFileName?: string;
  note?: string;
  mismatchCount: number;
  createdAt: IsoDateTime;
  createdBy: ActorRef;
}

export const REMITTANCE_MATCH_STATUSES = [
  'MATCHED',
  'AMOUNT_DIFFERS',
  'MISSING_FROM_SONARWA',
  'NOT_IN_OUR_RECORDS',
] as const;
export type RemittanceMatchStatus = (typeof REMITTANCE_MATCH_STATUSES)[number];

/** One row of the reconciliation grid: our line next to SONARWA's row. */
export interface RemittanceMatchRow {
  /** Stable within one import; used to address a row when overriding. */
  rowId: string;
  matchStatus: RemittanceMatchStatus;
  contractNumber: string;
  /** Absent for `NOT_IN_OUR_RECORDS`. */
  lineId?: string;
  statementId?: string;
  vetName?: string;
  /** 0 for `NOT_IN_OUR_RECORDS`. */
  expectedAmount: MoneyAmount;
  /** 0 for `MISSING_FROM_SONARWA`. */
  sonarwaAmount: MoneyAmount;
  differenceAmount: MoneyAmount;
}

export interface RemittanceImportTotals {
  expectedAmount: MoneyAmount;
  sonarwaAmount: MoneyAmount;
  differenceAmount: MoneyAmount;
  matchedCount: number;
  differsCount: number;
  missingCount: number;
  unknownCount: number;
}

/**
 * Response of `POST /receipts/importRemittance`. Nothing is saved as a receipt
 * until `createReceipt` is called. Rows are paged separately because remittance
 * files can hold thousands of lines.
 */
export interface RemittanceImportResult {
  importId: string;
  fileName: string;
  totals: RemittanceImportTotals;
}

export interface RemittanceRowsQuery extends PageQuery {
  matchStatus?: RemittanceMatchStatus | RemittanceMatchStatus[];
  search?: string;
}

export interface ImportRemittanceInput {
  module: FinanceModule;
  statementIds: string[];
  file: File;
}

export interface CreateReceiptInput {
  module: FinanceModule;
  amount: MoneyAmount;
  receivedAt: DateOnly;
  reference: string;
  /** Must add up exactly to `amount`. */
  allocations: Array<{ statementId: string; amount: MoneyAmount }>;
  /** Created by `importRemittance`; its matches are applied to the lines. */
  remittanceImportId?: string;
  /** Manual per-line amounts that replace the imported or default value. */
  lineOverrides?: Array<{ lineId: string; sonarwaAmount: MoneyAmount }>;
  note?: string;
}

export interface ReceiptsQuery extends PageQuery {
  module: FinanceModule;
  period?: PeriodFilter;
  statementId?: string;
  search?: string;
}
