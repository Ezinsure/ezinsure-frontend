import {
  addDays,
  calcExpectedAmount,
  monthPeriod,
  toDateOnly,
  type LedgerLine,
  type LedgerSource,
  type Mismatch,
  type Receipt,
  type VetRef,
} from '../domain';
import { aggregateVets } from './aggregate';
import { createRng, toIso } from './helpers';
import { recordMismatch } from './mismatch-factory';
import {
  MOCK_ACTOR,
  MOCK_CURRENCY,
  MOCK_MODULE,
  MOCK_VAT_RATE,
  nextSeq,
  pad,
  type MockState,
  type StatementRecord,
} from './state';

const VETS: VetRef[] = [
  { id: 'vet-001', name: 'Habimana Claude', district: 'Musanze', bankName: 'Bank of Kigali', bankAccountNumber: '00040-0123456-11', phoneNumber: '0788000001' },
  { id: 'vet-002', name: 'Uwase Divine', district: 'Nyamasheke', bankName: 'Equity Bank', bankAccountNumber: '4001-2233445', phoneNumber: '0788000002' },
  { id: 'vet-003', name: 'Nshimiyimana Eric', district: 'Gatsibo', bankName: 'I&M Bank', bankAccountNumber: '20011-889900', phoneNumber: '0788000003' },
  { id: 'vet-004', name: 'Mukamana Alice', district: 'Huye', bankName: 'Bank of Kigali', bankAccountNumber: '00040-7788990-21', phoneNumber: '0788000004' },
  { id: 'vet-005', name: 'Niyonzima Jean Paul', district: 'Rubavu', phoneNumber: '0788000005' },
  { id: 'vet-006', name: 'Ingabire Grace', district: 'Kayonza', bankName: 'Equity Bank', bankAccountNumber: '4001-9988776', phoneNumber: '0788000006' },
];

const CLIENTS = [
  'Mutesi Aline', 'Bizimana Jean', 'Uwimana Patrick', 'Mukeshimana Rose', 'Ndayisaba Paul',
  'Nyirahabimana Esther', 'Habyarimana Joseph', 'Uwamahoro Sandrine', 'Kayitare Emmanuel', 'Mugisha David',
];

type Stage = LedgerLine['stage'];
type Rng = () => number;

interface MonthContext {
  state: MockState;
  rng: Rng;
  k: number;
  first: Date;
  periodKey: string;
  statement: StatementRecord;
}

const MONTH_LINE_COUNT = 28;
const STATEMENT_STATUS_BY_AGE = ['OPEN', 'ISSUED', 'ISSUED', 'RECONCILED', 'PARTIALLY_RECONCILED'] as const;

function buildLine(ctx: MonthContext, index: number, stage: Stage, dates: {
  submitted: Date;
  approved?: Date;
  paid?: Date;
}): LedgerLine {
  const { state, rng, periodKey } = ctx;
  const seq = nextSeq(state, 'line');
  const vet = VETS[Math.floor(rng() * VETS.length)];
  const netPremium = (60 + Math.floor(rng() * 540)) * 1000;
  const vetCommission = Math.round(netPremium * 0.1);
  const companyCommission = Math.round(netPremium * 0.035);
  const { vatAmount, expectedAmount } = calcExpectedAmount(vetCommission, companyCommission, MOCK_VAT_RATE);
  const source: LedgerSource = index % 5 === 0 ? 'EXTERNAL_VET' : 'PLATFORM_VET';

  return {
    id: `line-${pad(seq)}`,
    module: MOCK_MODULE,
    source,
    stage,
    currency: MOCK_CURRENCY,
    contractNumber: `LS-${periodKey.slice(2, 4)}-${pad(seq)}`,
    microchipNumber: `6430${pad(100000 + seq * 7919, 11)}`,
    clientName: CLIENTS[Math.floor(rng() * CLIENTS.length)],
    clientDistrict: vet.district,
    vet,
    netPremium,
    vetCommission,
    companyCommission,
    vatAmount,
    expectedAmount,
    submittedAt: toIso(dates.submitted),
    approvedAt: dates.approved ? toIso(dates.approved) : undefined,
    paidAt: dates.paid ? toIso(dates.paid) : undefined,
    hasOpenMismatch: false,
  };
}

function lineDates(ctx: MonthContext, paidDay: number) {
  const { rng, first } = ctx;
  const paid = new Date(first.getFullYear(), first.getMonth(), paidDay, 10);
  const approved = addDays(paid, -(3 + Math.floor(rng() * 4)));
  const submitted = addDays(approved, -(4 + Math.floor(rng() * 9)));
  return { submitted, approved, paid };
}

function attachStatement(line: LedgerLine, statement: StatementRecord, billedAt?: Date): void {
  line.statementId = statement.id;
  line.statementNumber = statement.statementNumber;
  if (billedAt) line.billedAt = toIso(billedAt);
}

function buildPayout(
  ctx: MonthContext,
  lines: LedgerLine[],
  status: 'PAID' | 'PREPARED',
  when: Date,
): void {
  const { state, periodKey } = ctx;
  const payoutNumber = `PAY-${periodKey}-${pad(nextSeq(state, `payout-${periodKey}`))}`;
  const id = `payout-${payoutNumber.toLowerCase()}`;
  const vets = aggregateVets(lines).map((v) => ({
    ...v,
    paymentReference: status === 'PAID' ? `TRX-${v.id.slice(-3)}-${periodKey.replace('-', '')}` : undefined,
  }));
  for (const line of lines) {
    line.payoutId = id;
    line.payoutNumber = payoutNumber;
  }
  state.payouts.push({
    lineIds: lines.map((l) => l.id),
    vets,
    payout: {
      id,
      payoutNumber,
      module: MOCK_MODULE,
      status,
      currency: MOCK_CURRENCY,
      vetCount: vets.length,
      lineCount: lines.length,
      totalAmount: lines.reduce((s, l) => s + l.vetCommission, 0),
      preparedAt: toIso(addDays(when, status === 'PAID' ? -1 : 0)),
      preparedBy: MOCK_ACTOR,
      paidAt: status === 'PAID' ? toIso(when) : undefined,
      paidBy: status === 'PAID' ? MOCK_ACTOR : undefined,
    },
  });
}

function addMismatch(
  ctx: MonthContext,
  receipt: Receipt,
  line: LedgerLine,
  sonarwaAmount: number,
  kind: Mismatch['kind'],
  overrides: Partial<Mismatch> = {},
): void {
  recordMismatch(
    ctx.state,
    {
      kind,
      statement: ctx.statement,
      receiptId: receipt.id,
      line,
      contractNumber: line.contractNumber,
      vetName: line.vet.name,
      expectedAmount: line.expectedAmount,
      sonarwaAmount,
      createdAt: receipt.createdAt,
    },
    overrides,
  );
  receipt.mismatchCount += 1;
}

/** Receipt for a past statement: some lines differ, some are missing, the rest match. */
function settleStatement(ctx: MonthContext, lines: LedgerLine[]): void {
  const { state, first, k, statement } = ctx;
  const receivedAt = new Date(first.getFullYear(), first.getMonth() + 2, k === 4 ? 12 : 20, 11);
  const reimbursedAt = toIso(receivedAt);
  const receipt: Receipt = {
    id: `rcp-${ctx.periodKey}`,
    receiptNumber: `RCP-${receivedAt.getFullYear()}-${pad(nextSeq(state, 'receipt'))}`,
    module: MOCK_MODULE,
    currency: MOCK_CURRENCY,
    amount: 0,
    receivedAt: toDateOnly(receivedAt),
    reference: `SNW-REM-${ctx.periodKey}`,
    allocations: [],
    remittanceFileName: `sonarwa-remittance-${ctx.periodKey}.xlsx`,
    mismatchCount: 0,
    createdAt: reimbursedAt,
    createdBy: MOCK_ACTOR,
  };

  let total = 0;
  lines.forEach((line, i) => {
    const differs = k === 4 && [3, 9, 15].includes(i);
    const missing = k === 4 && [5, 21].includes(i);
    const rounding = k === 3 && i === 4;
    if (missing) {
      addMismatch(ctx, receipt, line, 0, 'MISSING_FROM_SONARWA');
    } else {
      const sonarwaAmount = differs
        ? Math.round(line.expectedAmount * 0.95)
        : line.expectedAmount - (rounding ? 1 : 0);
      total += sonarwaAmount;
      line.stage = 'REIMBURSED';
      line.reimbursedAt = reimbursedAt;
      line.receivedAmount = sonarwaAmount;
      if (differs) addMismatch(ctx, receipt, line, sonarwaAmount, 'AMOUNT_DIFFERS');
      if (rounding) {
        addMismatch(ctx, receipt, line, sonarwaAmount, 'AMOUNT_DIFFERS', {
          status: 'EXPLAINED',
          reasonCode: 'ROUNDING',
          resolvedAt: reimbursedAt,
          resolvedBy: MOCK_ACTOR,
        });
      }
    }
  });

  receipt.amount = total;
  receipt.allocations = [{ statementId: statement.id, statementNumber: statement.statementNumber, amount: total }];
  state.receipts.push(receipt);
}

function buildPastMonth(ctx: MonthContext): void {
  const { state, first, k, statement } = ctx;
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lines: LedgerLine[] = [];
  for (let i = 0; i < MONTH_LINE_COUNT; i += 1) {
    const paidDay = i < MONTH_LINE_COUNT / 2 ? 8 : Math.min(22, lastDay);
    const line = buildLine(ctx, i, 'BILLED', lineDates(ctx, paidDay));
    attachStatement(line, statement, new Date(statement.issuedAt ?? state.now));
    lines.push(line);
  }
  const half = MONTH_LINE_COUNT / 2;
  buildPayout(ctx, lines.slice(0, half), 'PAID', new Date(lines[0].paidAt as string));
  buildPayout(ctx, lines.slice(half), 'PAID', new Date(lines[half].paidAt as string));
  state.lines.push(...lines);
  if (k >= 3) settleStatement(ctx, lines);
}

function buildCurrentMonth(ctx: MonthContext): void {
  const { state, rng, first, statement } = ctx;
  const { now } = state;
  const paidDay = Math.max(1, now.getDate() - 2);
  const paid: LedgerLine[] = [];
  const initiated: LedgerLine[] = [];

  const plan: Stage[] = [
    ...Array<Stage>(12).fill('PAID'),
    ...Array<Stage>(4).fill('PAYMENT_INITIATED'),
    ...Array<Stage>(8).fill('READY_TO_BE_PAID'),
    ...Array<Stage>(5).fill('IN_REVIEW'),
    'REJECTED',
  ];

  plan.forEach((stage, i) => {
    const days = (min: number, spread: number) => min + Math.floor(rng() * spread);
    let dates: { submitted: Date; approved?: Date; paid?: Date };
    if (stage === 'PAID') {
      dates = lineDates(ctx, paidDay);
    } else if (stage === 'PAYMENT_INITIATED' || stage === 'READY_TO_BE_PAID') {
      const approved = addDays(now, -days(1, 10));
      dates = { approved, submitted: addDays(approved, -days(3, 7)) };
    } else {
      dates = { submitted: addDays(now, -days(1, 10)) };
    }
    const line = buildLine(ctx, i, stage, dates);
    if (stage === 'PAID') {
      attachStatement(line, statement);
      paid.push(line);
    }
    if (stage === 'PAYMENT_INITIATED') initiated.push(line);
    state.lines.push(line);
  });

  buildPayout(ctx, paid, 'PAID', new Date(paid[0].paidAt as string));
  buildPayout(ctx, initiated, 'PREPARED', addDays(now, -1));
}

/** Five months of demo data ending today: open, issued, overdue, reconciled and short-paid. */
export function buildFixtures(now: Date = new Date()): MockState {
  const state: MockState = {
    now,
    lines: [],
    statements: [],
    payouts: [],
    receipts: [],
    mismatches: [],
    imports: new Map(),
    counters: {},
  };
  const rng = createRng(20261116);

  for (let k = 4; k >= 0; k -= 1) {
    const first = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const period = monthPeriod(first.getFullYear(), first.getMonth());
    const issuedAt =
      k >= 1
        ? new Date(Math.min(new Date(first.getFullYear(), first.getMonth() + 1, 2, 9).getTime(), now.getTime()))
        : undefined;
    const statement: StatementRecord = {
      id: `stm-${period.key}`,
      statementNumber: `STM-${period.key}`,
      module: MOCK_MODULE,
      periodFrom: period.from,
      periodTo: period.to,
      status: STATEMENT_STATUS_BY_AGE[k],
      createdAt: toIso(first),
      issuedAt: issuedAt ? toIso(issuedAt) : undefined,
      dueAt: issuedAt ? toDateOnly(addDays(issuedAt, 30)) : undefined,
    };
    state.statements.push(statement);

    const ctx: MonthContext = { state, rng, k, first, periodKey: period.key, statement };
    if (k === 0) buildCurrentMonth(ctx);
    else buildPastMonth(ctx);
  }
  return state;
}
