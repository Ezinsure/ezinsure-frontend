import type {
  CurrencyCode,
  DateOnly,
  FinanceModule,
  IsoDateTime,
  MoneyAmount,
  PageQuery,
  PeriodFilter,
} from './common';
import type { MismatchStatus } from './mismatches';

export const STATEMENT_STATUSES = [
  'OPEN',
  'ISSUED',
  'PARTIALLY_RECONCILED',
  'RECONCILED',
  'WRITTEN_OFF',
] as const;
export type StatementStatus = (typeof STATEMENT_STATUSES)[number];

export const STATEMENT_STATUS_LABELS: Record<StatementStatus, string> = {
  OPEN: 'Open',
  ISSUED: 'Issued',
  PARTIALLY_RECONCILED: 'Partly reconciled',
  RECONCILED: 'Reconciled',
  WRITTEN_OFF: 'Written off',
};

/** A period invoice we send SONARWA for everything paid to vets in that period. */
export interface Statement {
  id: string;
  /** Human-readable, e.g. `STM-2026-11`. */
  statementNumber: string;
  module: FinanceModule;
  status: StatementStatus;
  currency: CurrencyCode;
  periodFrom: DateOnly;
  periodTo: DateOnly;

  lineCount: number;
  vetCount: number;
  vetCommissionTotal: MoneyAmount;
  companyCommissionTotal: MoneyAmount;
  /** vetCommissionTotal + companyCommissionTotal */
  subtotal: MoneyAmount;
  vatRate: number;
  vatAmount: MoneyAmount;
  /** subtotal + vatAmount. Frozen once the statement is issued. */
  amountDue: MoneyAmount;

  receivedAmount: MoneyAmount;
  writtenOffAmount: MoneyAmount;
  /** `amountDue - receivedAmount - writtenOffAmount`; negative means overpaid. */
  outstandingAmount: MoneyAmount;

  openMismatchCount: number;
  openMismatchAmount: MoneyAmount;

  createdAt: IsoDateTime;
  issuedAt?: IsoDateTime;
  dueAt?: DateOnly;
  ageDays?: number;
  writeOffReason?: string;
}

/** A line as it appears on a statement, with its amount frozen at issue time. */
export interface StatementLine {
  lineId: string;
  contractNumber: string;
  clientName: string;
  vetId: string;
  vetName: string;
  paidAt: IsoDateTime;
  vetCommission: MoneyAmount;
  companyCommission: MoneyAmount;
  vatAmount: MoneyAmount;
  expectedAmount: MoneyAmount;
  receivedAmount?: MoneyAmount;
  /** `receivedAmount - expectedAmount`, when SONARWA has paid. */
  differenceAmount?: MoneyAmount;
  mismatchId?: string;
  mismatchStatus?: MismatchStatus;
}

export interface StatementsQuery extends PageQuery {
  module: FinanceModule;
  status?: StatementStatus | StatementStatus[];
  /** Applied to the statement period. */
  period?: PeriodFilter;
  /** Only statements outstanding longer than the overdue threshold. */
  overdueOnly?: boolean;
}

export interface StatementLinesQuery extends PageQuery {
  vetId?: string;
  /** `withMismatch` keeps only lines with an open mismatch. */
  withMismatch?: boolean;
  search?: string;
}

export interface IssueCheckItem {
  code: string;
  message: string;
  /** How many lines the warning or blocker concerns. */
  lineCount?: number;
}

/** Result of the pre-flight check run before issuing a statement. */
export interface StatementIssueChecks {
  canIssue: boolean;
  /** Must be fixed before issuing. */
  blockers: IssueCheckItem[];
  /** Can be acknowledged and ignored. */
  warnings: IssueCheckItem[];
}

export interface IssueStatementInput {
  /** Defaults to 30 days after issue. */
  dueAt?: DateOnly;
  note?: string;
  /** Required to issue when `warnings` is not empty. */
  acknowledgeWarnings?: boolean;
}

export interface WriteOffStatementInput {
  reason: string;
}
