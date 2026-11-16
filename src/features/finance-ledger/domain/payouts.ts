import type {
  ActorRef,
  CurrencyCode,
  DateOnly,
  FinanceModule,
  IsoDateTime,
  MoneyAmount,
  PageQuery,
  PeriodFilter,
  VetRef,
} from './common';

export const PAYOUT_STATUSES = ['PREPARED', 'PAID', 'CANCELLED'] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  PREPARED: 'Prepared',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
};

/** A vet with approved lines that have not been put into a payout yet. */
export interface PayableVetRow extends VetRef {
  lineCount: number;
  netPremium: MoneyAmount;
  /** Vet commission owed. */
  amount: MoneyAmount;
  currency: CurrencyCode;
}

export interface PayableVetsQuery extends PageQuery {
  module: FinanceModule;
  /** Applied to `approvedAt` by default. */
  period?: PeriodFilter;
  search?: string;
}

export interface Payout {
  id: string;
  /** Human-readable, e.g. `PAY-2026-11-0004`. */
  payoutNumber: string;
  module: FinanceModule;
  status: PayoutStatus;
  currency: CurrencyCode;
  vetCount: number;
  lineCount: number;
  totalAmount: MoneyAmount;
  notes?: string;
  preparedAt: IsoDateTime;
  preparedBy: ActorRef;
  paidAt?: IsoDateTime;
  paidBy?: ActorRef;
  cancelledAt?: IsoDateTime;
  cancelReason?: string;
}

export interface PayoutVetRow extends VetRef {
  lineCount: number;
  netPremium: MoneyAmount;
  amount: MoneyAmount;
  /** Bank / mobile-money reference, recorded when the payout is marked paid. */
  paymentReference?: string;
}

/** Pick lines explicitly, or pick vets and let the server select their ready lines. */
export type PayoutSelection =
  | { mode: 'lines'; lineIds: string[] }
  | { mode: 'vets'; vetIds: string[]; period: PeriodFilter };

export interface CreatePayoutInput {
  module: FinanceModule;
  selection: PayoutSelection;
  notes?: string;
}

export interface MarkPayoutPaidInput {
  paidAt: DateOnly;
  /** One entry per vet in the payout. */
  vets: Array<{ vetId: string; paymentReference: string }>;
}

export interface CancelPayoutInput {
  reason: string;
}

export interface PayoutsQuery extends PageQuery {
  module: FinanceModule;
  status?: PayoutStatus | PayoutStatus[];
  /** Applied to `preparedAt` unless `by=paidAt`. */
  period?: PeriodFilter;
  vetId?: string;
  search?: string;
}
