import {
  diffInDays,
  isAbsorbedMismatch,
  MISMATCH_KIND_LABELS,
  MISMATCH_REASON_LABELS,
  sumAmounts,
  type LedgerLine,
  type LineTimelineEvent,
  type Mismatch,
  type PeriodSummaryRow,
  type Statement,
  type StatementLine,
  type StatementStatus,
} from '../domain';
import { MOCK_ACTOR, MOCK_CURRENCY, MOCK_VAT_RATE, type MockState, type StatementRecord } from './state';

const linesOf = (state: MockState, statementId: string): LedgerLine[] =>
  state.lines.filter((l) => l.statementId === statementId);

const openMismatchesOf = (state: MockState, statementId: string): Mismatch[] =>
  state.mismatches.filter((m) => m.statementId === statementId && m.status === 'OPEN');

/** Money that has been paid against a statement. */
export const receivedFor = (state: MockState, statementId: string): number =>
  sumAmounts(
    state.receipts.flatMap((r) =>
      r.allocations.filter((a) => a.statementId === statementId).map((a) => a.amount),
    ),
  );

/** Short payments we agreed to absorb (written off, or explained as rounding). */
const writtenOffFor = (state: MockState, record: StatementRecord, amountDue: number, received: number): number => {
  const mismatchWriteOff = sumAmounts(
    state.mismatches
      .filter((m) => m.statementId === record.id && isAbsorbedMismatch(m.status, m.reasonCode))
      .map((m) => Math.max(0, -m.differenceAmount)),
  );
  if (record.status !== 'WRITTEN_OFF') return mismatchWriteOff;
  return mismatchWriteOff + Math.max(0, amountDue - received - mismatchWriteOff);
};

export function toStatement(state: MockState, record: StatementRecord): Statement {
  const lines = linesOf(state, record.id);
  const vetCommissionTotal = sumAmounts(lines.map((l) => l.vetCommission));
  const companyCommissionTotal = sumAmounts(lines.map((l) => l.companyCommission));
  const vatAmount = sumAmounts(lines.map((l) => l.vatAmount));
  const amountDue = vetCommissionTotal + companyCommissionTotal + vatAmount;
  const received = receivedFor(state, record.id);
  const writtenOff = writtenOffFor(state, record, amountDue, received);
  const open = openMismatchesOf(state, record.id);
  const issued = record.issuedAt !== undefined;

  return {
    id: record.id,
    statementNumber: record.statementNumber,
    module: record.module,
    status: record.status,
    currency: MOCK_CURRENCY,
    periodFrom: record.periodFrom,
    periodTo: record.periodTo,
    lineCount: lines.length,
    vetCount: new Set(lines.map((l) => l.vet.id)).size,
    vetCommissionTotal,
    companyCommissionTotal,
    subtotal: vetCommissionTotal + companyCommissionTotal,
    vatRate: MOCK_VAT_RATE,
    vatAmount,
    amountDue,
    receivedAmount: received,
    writtenOffAmount: writtenOff,
    outstandingAmount: issued ? amountDue - received - writtenOff : amountDue,
    openMismatchCount: open.length,
    openMismatchAmount: sumAmounts(open.map((m) => m.differenceAmount)),
    createdAt: record.createdAt,
    issuedAt: record.issuedAt,
    dueAt: record.dueAt,
    ageDays: issued ? diffInDays(record.issuedAt as string, state.now) : undefined,
    writeOffReason: record.writeOffReason,
  };
}

export function toStatementLine(state: MockState, line: LedgerLine): StatementLine {
  const mismatch = state.mismatches.find((m) => m.lineId === line.id);
  return {
    lineId: line.id,
    contractNumber: line.contractNumber,
    clientName: line.clientName,
    vetId: line.vet.id,
    vetName: line.vet.name,
    paidAt: line.paidAt as string,
    vetCommission: line.vetCommission,
    companyCommission: line.companyCommission,
    vatAmount: line.vatAmount,
    expectedAmount: line.expectedAmount,
    receivedAmount: line.receivedAmount,
    differenceAmount:
      line.receivedAmount === undefined ? undefined : line.receivedAmount - line.expectedAmount,
    mismatchId: mismatch?.id,
    mismatchStatus: mismatch?.status,
  };
}

/** Moves a statement to the right status after receipts or resolutions change it. */
export function recomputeStatementStatus(state: MockState, statementId: string): void {
  const record = state.statements.find((s) => s.id === statementId);
  if (!record || record.status === 'OPEN' || record.status === 'WRITTEN_OFF') return;
  const view = toStatement(state, record);
  const settled = view.outstandingAmount <= 0 && view.openMismatchCount === 0;
  const next: StatementStatus = settled
    ? 'RECONCILED'
    : view.receivedAmount > 0 || view.writtenOffAmount > 0
      ? 'PARTIALLY_RECONCILED'
      : 'ISSUED';
  record.status = next;
}

export function toSummaryRow(state: MockState, periodKey: string, from: string, to: string): PeriodSummaryRow {
  const record = state.statements.find((s) => s.periodFrom === from);
  const paidLines = state.lines.filter((l) => l.paidAt && l.paidAt.slice(0, 7) === periodKey);
  const statement = record ? toStatement(state, record) : undefined;
  const issued = statement?.issuedAt !== undefined;
  return {
    periodKey,
    from,
    to,
    currency: MOCK_CURRENCY,
    paidToVetsAmount: sumAmounts(paidLines.map((l) => l.vetCommission)),
    paidLineCount: paidLines.length,
    billedAmount: issued ? statement.amountDue : 0,
    receivedAmount: statement?.receivedAmount ?? 0,
    writtenOffAmount: statement?.writtenOffAmount ?? 0,
    outstandingAmount: issued ? statement.outstandingAmount : 0,
    openMismatchCount: statement?.openMismatchCount ?? 0,
    openMismatchAmount: statement?.openMismatchAmount ?? 0,
    statementId: statement?.id,
    statementNumber: statement?.statementNumber,
    statementStatus: statement?.status,
    issuedAt: statement?.issuedAt,
    ageDays: statement?.ageDays,
  };
}

/* -------------------------------- timeline -------------------------------- */

const midpoint = (a: string, b: string): string =>
  new Date((new Date(a).getTime() + new Date(b).getTime()) / 2).toISOString();

export function buildTimeline(state: MockState, line: LedgerLine): LineTimelineEvent[] {
  const events: LineTimelineEvent[] = [];
  const add = (type: LineTimelineEvent['type'], at: string, extra: Partial<LineTimelineEvent> = {}) =>
    events.push({ id: `${line.id}-${type}-${events.length}`, type, at, ...extra });

  add('SUBMITTED', line.submittedAt, { actor: { id: line.vet.id, name: line.vet.name, role: 'VET' } });

  if (line.stage === 'REJECTED') {
    add('SONARWA_REJECTED', new Date(new Date(line.submittedAt).getTime() + 2 * 86_400_000).toISOString(), {
      note: 'Contract number does not match the policy schedule.',
    });
  }
  if (line.approvedAt) {
    add('SONARWA_APPROVED', midpoint(line.submittedAt, line.approvedAt));
    add('ADMIN_APPROVED', line.approvedAt, { actor: { id: 'admin-demo', name: 'Admin (demo)', role: 'ADMIN' } });
  }

  const payout = state.payouts.find((p) => p.payout.id === line.payoutId);
  if (payout) {
    add('PAYOUT_PREPARED', payout.payout.preparedAt, {
      actor: payout.payout.preparedBy,
      reference: payout.payout.payoutNumber,
      refId: payout.payout.id,
      amount: line.vetCommission,
    });
  }
  if (line.paidAt) {
    const vetRow = payout?.vets.find((v) => v.id === line.vet.id);
    add('PAID_TO_VET', line.paidAt, {
      actor: MOCK_ACTOR,
      amount: line.vetCommission,
      reference: vetRow?.paymentReference,
      refId: payout?.payout.id,
    });
  }
  if (line.billedAt) {
    add('STATEMENT_ISSUED', line.billedAt, {
      actor: MOCK_ACTOR,
      amount: line.expectedAmount,
      reference: line.statementNumber,
      refId: line.statementId,
    });
  }
  if (line.reimbursedAt) {
    const receipt = state.receipts.find((r) =>
      r.allocations.some((a) => a.statementId === line.statementId),
    );
    add('REIMBURSED', line.reimbursedAt, {
      actor: MOCK_ACTOR,
      amount: line.receivedAmount,
      reference: receipt?.reference,
      refId: receipt?.id,
    });
  }
  for (const m of state.mismatches.filter((x) => x.lineId === line.id)) {
    add('MISMATCH_RECORDED', m.createdAt, {
      amount: m.differenceAmount,
      note: MISMATCH_KIND_LABELS[m.kind],
      refId: m.id,
    });
    if (m.resolvedAt) {
      add('MISMATCH_RESOLVED', m.resolvedAt, {
        actor: m.resolvedBy,
        note: [m.reasonCode ? MISMATCH_REASON_LABELS[m.reasonCode] : undefined, m.note]
          .filter(Boolean)
          .join(' — '),
        refId: m.id,
      });
    }
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}
