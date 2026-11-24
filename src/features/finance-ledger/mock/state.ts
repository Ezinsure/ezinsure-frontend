import type {
  ActorRef,
  FinanceModule,
  LedgerLine,
  Mismatch,
  Payout,
  PayoutVetRow,
  Receipt,
  RemittanceImportResult,
  RemittanceMatchRow,
  StatementStatus,
  DateOnly,
  IsoDateTime,
} from '../domain';

export const MOCK_MODULE: FinanceModule = 'livestock';
export const MOCK_CURRENCY = 'RWF';
export const MOCK_VAT_RATE = 0.18;
export const MOCK_ACTOR: ActorRef = {
  id: 'finance-demo',
  name: 'Finance (demo)',
  role: 'FINANCE',
};

/** Stored part of a statement; money fields are derived from lines on read. */
export interface StatementRecord {
  id: string;
  statementNumber: string;
  module: FinanceModule;
  periodFrom: DateOnly;
  periodTo: DateOnly;
  status: StatementStatus;
  createdAt: IsoDateTime;
  issuedAt?: IsoDateTime;
  dueAt?: DateOnly;
  writeOffReason?: string;
}

export interface PayoutRecord {
  payout: Payout;
  lineIds: string[];
  vets: PayoutVetRow[];
}

export interface ImportRecord {
  result: RemittanceImportResult;
  rows: RemittanceMatchRow[];
  statementIds: string[];
}

export interface MockState {
  /** "Today" for the demo; fixed when the store is created. */
  now: Date;
  lines: LedgerLine[];
  statements: StatementRecord[];
  payouts: PayoutRecord[];
  receipts: Receipt[];
  mismatches: Mismatch[];
  imports: Map<string, ImportRecord>;
  counters: Record<string, number>;
}

export function nextSeq(state: MockState, key: string): number {
  state.counters[key] = (state.counters[key] ?? 0) + 1;
  return state.counters[key];
}

export const pad = (n: number, width = 4): string => String(n).padStart(width, '0');

export const findStatement = (state: MockState, id: string): StatementRecord | undefined =>
  state.statements.find((s) => s.id === id);
