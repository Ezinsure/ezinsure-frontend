import { FinanceApiError } from '../api/http';
import type { PayoutsApi } from '../api/types';
import { hasErrors, toDateOnly, validateMarkPayoutPaid, type LedgerLine, type Payout } from '../domain';
import { aggregateVets } from './aggregate';
import { conflict, delay, inPeriod, invalid, notFound, toIso } from './helpers';
import { findOrCreateOpenStatement } from './statement-records';
import {
  MOCK_ACTOR,
  MOCK_CURRENCY,
  MOCK_MODULE,
  nextSeq,
  pad,
  type MockState,
} from './state';

type PayoutWrites = Pick<PayoutsApi, 'createPayout' | 'markPayoutPaid' | 'cancelPayout'>;

function selectLines(state: MockState, selection: Parameters<PayoutsApi['createPayout']>[0]['selection']): LedgerLine[] {
  if (selection.mode === 'lines') {
    if (!selection.lineIds.length) throw invalid('Select at least one line.');
    const lines = selection.lineIds.map((id) => state.lines.find((l) => l.id === id));
    if (lines.some((l) => !l || l.stage !== 'READY_TO_BE_PAID')) {
      throw conflict('Some selected lines are no longer ready to be paid.', 'LINE_NOT_PAYABLE');
    }
    return lines as LedgerLine[];
  }
  if (!selection.vetIds.length) throw invalid('Select at least one vet.');
  const period = { ...selection.period, by: 'approvedAt' as const };
  const lines = state.lines.filter(
    (l) =>
      l.stage === 'READY_TO_BE_PAID' &&
      selection.vetIds.includes(l.vet.id) &&
      inPeriod(l.approvedAt, period),
  );
  if (!lines.length) {
    throw new FinanceApiError(
      'No lines are ready to be paid for the selected vets and period.',
      422,
      'NO_ELIGIBLE_LINES',
    );
  }
  return lines;
}

function requirePayout(state: MockState, id: string) {
  const record = state.payouts.find((p) => p.payout.id === id);
  if (!record) throw notFound('Payout');
  return record;
}

export function createPayoutWrites(getState: () => MockState): PayoutWrites {
  return {
    async createPayout(input) {
      await delay(350);
      const state = getState();
      const lines = selectLines(state, input.selection);
      const now = new Date(state.now);
      const periodKey = `${now.getFullYear()}-${pad(now.getMonth() + 1, 2)}`;
      const payoutNumber = `PAY-${periodKey}-${pad(nextSeq(state, `payout-${periodKey}`))}`;
      const id = `payout-${payoutNumber.toLowerCase()}`;
      const vets = aggregateVets(lines);

      for (const line of lines) {
        line.stage = 'PAYMENT_INITIATED';
        line.payoutId = id;
        line.payoutNumber = payoutNumber;
      }
      const payout: Payout = {
        id,
        payoutNumber,
        module: MOCK_MODULE,
        status: 'PREPARED',
        currency: MOCK_CURRENCY,
        vetCount: vets.length,
        lineCount: lines.length,
        totalAmount: lines.reduce((s, l) => s + l.vetCommission, 0),
        notes: input.notes,
        preparedAt: toIso(now),
        preparedBy: MOCK_ACTOR,
      };
      state.payouts.push({ payout, lineIds: lines.map((l) => l.id), vets });
      return payout;
    },

    async markPayoutPaid(id, input) {
      await delay(350);
      const state = getState();
      const record = requirePayout(state, id);
      if (record.payout.status !== 'PREPARED') {
        throw conflict('Only a prepared payout can be marked as paid.', 'PAYOUT_NOT_PREPARED');
      }
      const errors = validateMarkPayoutPaid(input, record.vets.map((v) => v.id), state.now);
      if (hasErrors(errors)) throw invalid('Please correct the highlighted fields.', errors);

      const references = new Map(input.vets.map((v) => [v.vetId, v.paymentReference.trim()]));
      record.vets = record.vets.map((v) => ({ ...v, paymentReference: references.get(v.id) }));

      // Keeps the timeline in order when a payout is prepared and paid on the same day.
      const paidAt =
        input.paidAt === toDateOnly(state.now) ? toIso(state.now) : `${input.paidAt}T10:00:00.000Z`;
      const statement = findOrCreateOpenStatement(state, input.paidAt);
      for (const line of state.lines.filter((l) => record.lineIds.includes(l.id))) {
        line.stage = 'PAID';
        line.paidAt = paidAt;
        line.statementId = statement.id;
        line.statementNumber = statement.statementNumber;
      }
      record.payout = { ...record.payout, status: 'PAID', paidAt, paidBy: MOCK_ACTOR };
      return record.payout;
    },

    async cancelPayout(id, input) {
      await delay(350);
      const state = getState();
      const record = requirePayout(state, id);
      if (record.payout.status !== 'PREPARED') {
        throw conflict('Only a prepared payout can be cancelled.', 'PAYOUT_NOT_PREPARED');
      }
      if (!input.reason.trim()) throw invalid('Enter a reason.', { reason: 'Enter a reason.' });

      for (const line of state.lines.filter((l) => record.lineIds.includes(l.id))) {
        line.stage = 'READY_TO_BE_PAID';
        line.payoutId = undefined;
        line.payoutNumber = undefined;
      }
      record.payout = {
        ...record.payout,
        status: 'CANCELLED',
        cancelledAt: toIso(state.now),
        cancelReason: input.reason.trim(),
      };
      return record.payout;
    },
  };
}
