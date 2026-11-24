import type {
  ActorRef,
  CurrencyCode,
  FinanceModule,
  IsoDateTime,
  LedgerSource,
  MoneyAmount,
  PageQuery,
  PeriodFilter,
  VetRef,
} from './common';
import type { LedgerStage } from './stages';

/** One insured animal / contract: the unit that is reviewed, paid, billed and reimbursed. */
export interface LedgerLine {
  id: string;
  module: FinanceModule;
  source: LedgerSource;
  stage: LedgerStage;
  currency: CurrencyCode;

  contractNumber: string;
  microchipNumber?: string;
  clientName: string;
  clientDistrict?: string;
  vet: VetRef;

  /** Parent record in the originating pipeline. */
  applicationId?: string;
  batchId?: string;
  batchNumber?: string;

  netPremium: MoneyAmount;
  /** Paid to the vet. */
  vetCommission: MoneyAmount;
  companyCommission: MoneyAmount;
  vatAmount: MoneyAmount;
  /** vetCommission + companyCommission + vatAmount: what we expect SONARWA to pay. */
  expectedAmount: MoneyAmount;

  submittedAt: IsoDateTime;
  approvedAt?: IsoDateTime;
  paidAt?: IsoDateTime;
  billedAt?: IsoDateTime;
  reimbursedAt?: IsoDateTime;

  payoutId?: string;
  payoutNumber?: string;
  statementId?: string;
  statementNumber?: string;

  /** What SONARWA actually paid for this line (once reimbursed). */
  receivedAmount?: MoneyAmount;
  hasOpenMismatch: boolean;
  openMismatchId?: string;
  /** `receivedAmount - expectedAmount` while a mismatch is open. */
  mismatchAmount?: MoneyAmount;
}

export const LINE_TIMELINE_EVENT_TYPES = [
  'SUBMITTED',
  'SONARWA_APPROVED',
  'SONARWA_REJECTED',
  'ADMIN_APPROVED',
  'ADMIN_REJECTED',
  'PAYOUT_PREPARED',
  'PAID_TO_VET',
  'STATEMENT_ISSUED',
  'REIMBURSED',
  'MISMATCH_RECORDED',
  'MISMATCH_RESOLVED',
] as const;
export type LineTimelineEventType = (typeof LINE_TIMELINE_EVENT_TYPES)[number];

export interface LineTimelineEvent {
  id: string;
  type: LineTimelineEventType;
  at: IsoDateTime;
  actor?: ActorRef;
  amount?: MoneyAmount;
  /** Payment reference, statement number, receipt reference, … */
  reference?: string;
  note?: string;
  /** Id of the related payout / statement / receipt / mismatch. */
  refId?: string;
}

export interface LedgerLineDetail {
  line: LedgerLine;
  timeline: LineTimelineEvent[];
}

export interface LedgerLinesQuery extends PageQuery {
  module: FinanceModule;
  /** Default basis is endpoint-specific (`submittedAt`). */
  period?: PeriodFilter;
  stage?: LedgerStage | LedgerStage[];
  source?: LedgerSource;
  vetId?: string;
  statementId?: string;
  payoutId?: string;
  hasOpenMismatch?: boolean;
  /** Matches contract, microchip, client and vet name. */
  search?: string;
}
