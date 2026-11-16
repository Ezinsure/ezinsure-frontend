import type {
  FinanceSummaryApi,
  LedgerApi,
  MismatchesApi,
  PayoutsApi,
  ReceiptsApi,
  StatementsApi,
} from '../api/types';
import {
  listMonthPeriods,
  sumAmounts,
  type LedgerLine,
  type PeriodBasis,
  type PeriodFilter,
} from '../domain';
import { toPayableRows } from './aggregate';
import { delay, inPeriod, matchesSearch, notFound, paginate, sortRows, toList } from './helpers';
import { MOCK_CURRENCY, MOCK_VAT_RATE, findStatement, type MockState } from './state';
import { buildTimeline, toStatement, toStatementLine, toSummaryRow } from './views';

type ReadApi = FinanceSummaryApi &
  LedgerApi &
  Pick<PayoutsApi, 'listPayableVets' | 'listPayouts' | 'getPayout' | 'listPayoutVets'> &
  Pick<StatementsApi, 'listStatements' | 'getStatement' | 'listStatementLines' | 'getStatementIssueChecks'> &
  Pick<ReceiptsApi, 'listReceipts' | 'getReceipt' | 'listRemittanceRows'> &
  Pick<MismatchesApi, 'listMismatches'>;

export type MockReadApi = ReadApi;

const lineDate = (line: LedgerLine, basis: PeriodBasis): string | undefined =>
  basis === 'preparedAt' ? undefined : line[basis];

const periodMatcher = (period: PeriodFilter | undefined, fallback: PeriodBasis) => (line: LedgerLine) =>
  inPeriod(lineDate(line, period?.by ?? fallback), period);

export function createReadApi(getState: () => MockState): ReadApi {
  return {
    async getSummary(query) {
      await delay();
      const state = getState();
      const rows = listMonthPeriods(query.from, query.to)
        .map((p) => toSummaryRow(state, p.key, p.from, p.to))
        .reverse();
      const sum = (pick: (r: (typeof rows)[number]) => number) => sumAmounts(rows.map(pick));
      return {
        module: query.module,
        currency: MOCK_CURRENCY,
        vatRate: MOCK_VAT_RATE,
        totals: {
          paidToVetsAmount: sum((r) => r.paidToVetsAmount),
          billedAmount: sum((r) => r.billedAmount),
          receivedAmount: sum((r) => r.receivedAmount),
          writtenOffAmount: sum((r) => r.writtenOffAmount),
          outstandingAmount: sum((r) => r.outstandingAmount),
          openMismatchCount: sum((r) => r.openMismatchCount),
          openMismatchAmount: sum((r) => r.openMismatchAmount),
        },
        rows,
      };
    },

    async listLines(query) {
      await delay();
      const stages = toList(query.stage);
      const inRange = periodMatcher(query.period, 'submittedAt');
      const rows = getState().lines.filter(
        (l) =>
          l.module === query.module &&
          inRange(l) &&
          (!stages || stages.includes(l.stage)) &&
          (!query.source || l.source === query.source) &&
          (!query.vetId || l.vet.id === query.vetId) &&
          (!query.statementId || l.statementId === query.statementId) &&
          (!query.payoutId || l.payoutId === query.payoutId) &&
          (query.hasOpenMismatch === undefined || l.hasOpenMismatch === query.hasOpenMismatch) &&
          matchesSearch(query.search, l.contractNumber, l.microchipNumber, l.clientName, l.vet.name),
      );
      return paginate(sortRows(rows, query.sort ?? '-submittedAt'), query);
    },

    async getLineDetail(lineId) {
      await delay(150);
      const state = getState();
      const line = state.lines.find((l) => l.id === lineId);
      if (!line) throw notFound('Line');
      return { line, timeline: buildTimeline(state, line) };
    },

    async listPayableVets(query) {
      await delay();
      const inRange = periodMatcher(query.period, 'approvedAt');
      const ready = getState().lines.filter(
        (l) => l.module === query.module && l.stage === 'READY_TO_BE_PAID' && inRange(l),
      );
      const rows = toPayableRows(ready).filter((r) => matchesSearch(query.search, r.name, r.district));
      return paginate(sortRows(rows, query.sort ?? '-amount'), query);
    },

    async listPayouts(query) {
      await delay();
      const statuses = toList(query.status);
      const basis = query.period?.by === 'paidAt' ? 'paidAt' : 'preparedAt';
      const rows = getState()
        .payouts.map((p) => p.payout)
        .filter(
          (p) =>
            p.module === query.module &&
            (!statuses || statuses.includes(p.status)) &&
            inPeriod(p[basis], query.period) &&
            matchesSearch(query.search, p.payoutNumber),
        );
      return paginate(sortRows(rows, query.sort ?? '-preparedAt'), query);
    },

    async getPayout(id) {
      await delay(150);
      const record = getState().payouts.find((p) => p.payout.id === id);
      if (!record) throw notFound('Payout');
      return record.payout;
    },

    async listPayoutVets(id, query) {
      await delay();
      const record = getState().payouts.find((p) => p.payout.id === id);
      if (!record) throw notFound('Payout');
      return paginate(sortRows(record.vets, query?.sort ?? '-amount'), query);
    },

    async listStatements(query) {
      await delay();
      const state = getState();
      const statuses = toList(query.status);
      const rows = state.statements
        .filter(
          (s) =>
            s.module === query.module &&
            (!statuses || statuses.includes(s.status)) &&
            (!query.period || (s.periodTo >= query.period.from && s.periodFrom <= query.period.to)),
        )
        .map((s) => toStatement(state, s))
        .filter((s) => !query.overdueOnly || (s.outstandingAmount > 0 && (s.ageDays ?? 0) >= 60));
      return paginate(sortRows(rows, query.sort ?? '-periodFrom'), query);
    },

    async getStatement(id) {
      await delay(150);
      const state = getState();
      const record = findStatement(state, id);
      if (!record) throw notFound('Statement');
      return toStatement(state, record);
    },

    async listStatementLines(id, query) {
      await delay();
      const state = getState();
      if (!findStatement(state, id)) throw notFound('Statement');
      const rows = state.lines
        .filter(
          (l) =>
            l.statementId === id &&
            (!query?.vetId || l.vet.id === query.vetId) &&
            (!query?.withMismatch || l.hasOpenMismatch) &&
            matchesSearch(query?.search, l.contractNumber, l.clientName, l.vet.name),
        )
        .map((l) => toStatementLine(state, l));
      return paginate(sortRows(rows, query?.sort ?? 'paidAt'), query);
    },

    async getStatementIssueChecks(id) {
      await delay(150);
      const state = getState();
      const record = findStatement(state, id);
      if (!record) throw notFound('Statement');
      const lines = state.lines.filter((l) => l.statementId === id);
      const blockers = [];
      const warnings = [];
      if (record.status !== 'OPEN') {
        blockers.push({ code: 'STATEMENT_NOT_OPEN', message: 'This statement has already been issued.' });
      }
      if (!lines.length) {
        blockers.push({ code: 'STATEMENT_EMPTY', message: 'There are no paid lines in this period yet.' });
      }
      const pending = state.lines.filter((l) => l.stage === 'PAYMENT_INITIATED');
      if (pending.length) {
        warnings.push({
          code: 'UNPAID_PAYOUTS',
          message: `${pending.length} lines are in payouts that are prepared but not marked paid. They will not be on this statement.`,
          lineCount: pending.length,
        });
      }
      return { canIssue: blockers.length === 0, blockers, warnings };
    },

    async listReceipts(query) {
      await delay();
      const rows = getState().receipts.filter(
        (r) =>
          r.module === query.module &&
          inPeriod(r.receivedAt, query.period) &&
          (!query.statementId || r.allocations.some((a) => a.statementId === query.statementId)) &&
          matchesSearch(query.search, r.receiptNumber, r.reference),
      );
      return paginate(sortRows(rows, query.sort ?? '-receivedAt'), query);
    },

    async getReceipt(id) {
      await delay(150);
      const receipt = getState().receipts.find((r) => r.id === id);
      if (!receipt) throw notFound('Receipt');
      return receipt;
    },

    async listRemittanceRows(importId, query) {
      await delay();
      const record = getState().imports.get(importId);
      if (!record) throw notFound('Remittance import');
      const statuses = toList(query?.matchStatus);
      const rows = record.rows.filter(
        (r) =>
          (!statuses || statuses.includes(r.matchStatus)) &&
          matchesSearch(query?.search, r.contractNumber, r.vetName),
      );
      return paginate(sortRows(rows, query?.sort), query);
    },

    async listMismatches(query) {
      await delay();
      const state = getState();
      const statuses = toList(query.status);
      const rows = state.mismatches.filter((m) => {
        const line = state.lines.find((l) => l.id === m.lineId);
        return (
          m.module === query.module &&
          (!statuses || statuses.includes(m.status)) &&
          (!query.kind || m.kind === query.kind) &&
          (!query.statementId || m.statementId === query.statementId) &&
          (!query.vetId || line?.vet.id === query.vetId) &&
          inPeriod(m.createdAt, query.period) &&
          matchesSearch(query.search, m.contractNumber, m.vetName)
        );
      });
      return paginate(sortRows(rows, query.sort ?? '-createdAt'), query);
    },
  };
}
