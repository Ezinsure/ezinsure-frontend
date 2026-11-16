import type {
  CurrencyCode,
  DateOnly,
  FinanceModule,
  IsoDateTime,
  MoneyAmount,
} from './common';
import type { StatementStatus } from './statements';

/**
 * One row of the Finance Home reconciliation table: everything that happened
 * for lines **paid to vets** inside one calendar month.
 */
export interface PeriodSummaryRow {
  /** `YYYY-MM` */
  periodKey: string;
  from: DateOnly;
  to: DateOnly;
  currency: CurrencyCode;

  /** Vet commission actually paid out in the period. */
  paidToVetsAmount: MoneyAmount;
  paidLineCount: number;
  /** Statement `amountDue` once issued; 0 while the statement is still open. */
  billedAmount: MoneyAmount;
  receivedAmount: MoneyAmount;
  writtenOffAmount: MoneyAmount;
  /** `billedAmount - receivedAmount - writtenOffAmount` */
  outstandingAmount: MoneyAmount;

  openMismatchCount: number;
  /** Signed sum of open mismatch differences (negative = SONARWA paid less). */
  openMismatchAmount: MoneyAmount;

  statementId?: string;
  statementNumber?: string;
  /** Absent when no statement exists for the period yet. */
  statementStatus?: StatementStatus;
  issuedAt?: IsoDateTime;
  /** Days since the statement was issued; absent while open. */
  ageDays?: number;
}

export interface FinanceSummaryTotals {
  paidToVetsAmount: MoneyAmount;
  billedAmount: MoneyAmount;
  receivedAmount: MoneyAmount;
  writtenOffAmount: MoneyAmount;
  outstandingAmount: MoneyAmount;
  openMismatchCount: number;
  openMismatchAmount: MoneyAmount;
}

export interface FinanceSummary {
  module: FinanceModule;
  currency: CurrencyCode;
  vatRate: number;
  totals: FinanceSummaryTotals;
  /** Newest period first. */
  rows: PeriodSummaryRow[];
}

export interface FinanceSummaryQuery {
  module: FinanceModule;
  from: DateOnly;
  to: DateOnly;
  /** Only monthly is supported for now. */
  granularity?: 'month';
}
