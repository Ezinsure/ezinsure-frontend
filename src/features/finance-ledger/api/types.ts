import type { PageQuery, Paginated, RequestOptions } from '../domain/common';
import type { LedgerLine, LedgerLineDetail, LedgerLinesQuery } from '../domain/ledger';
import type {
  Mismatch,
  MismatchesQuery,
  ResolveMismatchInput,
} from '../domain/mismatches';
import type {
  CancelPayoutInput,
  CreatePayoutInput,
  MarkPayoutPaidInput,
  PayableVetRow,
  PayableVetsQuery,
  Payout,
  PayoutVetRow,
  PayoutsQuery,
} from '../domain/payouts';
import type {
  CreateReceiptInput,
  ImportRemittanceInput,
  Receipt,
  ReceiptsQuery,
  RemittanceImportResult,
  RemittanceMatchRow,
  RemittanceRowsQuery,
} from '../domain/receipts';
import type {
  IssueStatementInput,
  Statement,
  StatementIssueChecks,
  StatementLine,
  StatementLinesQuery,
  StatementsQuery,
  WriteOffStatementInput,
} from '../domain/statements';
import type { FinanceSummary, FinanceSummaryQuery } from '../domain/summary';

type Opts = RequestOptions;

export interface FinanceSummaryApi {
  getSummary(query: FinanceSummaryQuery, options?: Opts): Promise<FinanceSummary>;
}

export interface LedgerApi {
  listLines(query: LedgerLinesQuery, options?: Opts): Promise<Paginated<LedgerLine>>;
  getLineDetail(lineId: string, options?: Opts): Promise<LedgerLineDetail>;
}

export interface PayoutsApi {
  listPayableVets(query: PayableVetsQuery, options?: Opts): Promise<Paginated<PayableVetRow>>;
  listPayouts(query: PayoutsQuery, options?: Opts): Promise<Paginated<Payout>>;
  getPayout(id: string, options?: Opts): Promise<Payout>;
  listPayoutVets(id: string, query?: PageQuery, options?: Opts): Promise<Paginated<PayoutVetRow>>;
  createPayout(input: CreatePayoutInput, options?: Opts): Promise<Payout>;
  markPayoutPaid(id: string, input: MarkPayoutPaidInput, options?: Opts): Promise<Payout>;
  cancelPayout(id: string, input: CancelPayoutInput, options?: Opts): Promise<Payout>;
}

export interface StatementsApi {
  listStatements(query: StatementsQuery, options?: Opts): Promise<Paginated<Statement>>;
  getStatement(id: string, options?: Opts): Promise<Statement>;
  listStatementLines(
    id: string,
    query?: StatementLinesQuery,
    options?: Opts,
  ): Promise<Paginated<StatementLine>>;
  getStatementIssueChecks(id: string, options?: Opts): Promise<StatementIssueChecks>;
  issueStatement(id: string, input: IssueStatementInput, options?: Opts): Promise<Statement>;
  writeOffStatement(
    id: string,
    input: WriteOffStatementInput,
    options?: Opts,
  ): Promise<Statement>;
}

export interface ReceiptsApi {
  listReceipts(query: ReceiptsQuery, options?: Opts): Promise<Paginated<Receipt>>;
  getReceipt(id: string, options?: Opts): Promise<Receipt>;
  importRemittance(input: ImportRemittanceInput, options?: Opts): Promise<RemittanceImportResult>;
  listRemittanceRows(
    importId: string,
    query?: RemittanceRowsQuery,
    options?: Opts,
  ): Promise<Paginated<RemittanceMatchRow>>;
  createReceipt(input: CreateReceiptInput, options?: Opts): Promise<Receipt>;
}

export interface MismatchesApi {
  listMismatches(query: MismatchesQuery, options?: Opts): Promise<Paginated<Mismatch>>;
  resolveMismatch(id: string, input: ResolveMismatchInput, options?: Opts): Promise<Mismatch>;
}

/** The complete finance ledger contract implemented by the real client and the mock. */
export type FinanceLedgerApi = FinanceSummaryApi &
  LedgerApi &
  PayoutsApi &
  StatementsApi &
  ReceiptsApi &
  MismatchesApi;
