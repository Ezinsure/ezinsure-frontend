import type { StatementsApi } from '../api/types';
import { addDays, toDateOnly } from '../domain';
import { conflict, delay, invalid, notFound, toIso } from './helpers';
import { findStatement, type MockState } from './state';
import { toStatement } from './views';

type StatementWrites = Pick<StatementsApi, 'issueStatement' | 'writeOffStatement'>;

function requireStatement(state: MockState, id: string) {
  const record = findStatement(state, id);
  if (!record) throw notFound('Statement');
  return record;
}

export function createStatementWrites(
  getState: () => MockState,
  getChecks: StatementsApi['getStatementIssueChecks'],
): StatementWrites {
  return {
    async issueStatement(id, input) {
      await delay(350);
      const state = getState();
      const record = requireStatement(state, id);
      const checks = await getChecks(id);
      if (checks.blockers.length) {
        throw conflict(checks.blockers[0].message, checks.blockers[0].code);
      }
      if (checks.warnings.length && !input.acknowledgeWarnings) {
        throw conflict('Acknowledge the warnings to issue this statement.', 'WARNINGS_NOT_ACKNOWLEDGED');
      }

      const issuedAt = toIso(state.now);
      record.status = 'ISSUED';
      record.issuedAt = issuedAt;
      record.dueAt = input.dueAt ?? toDateOnly(addDays(state.now, 30));
      for (const line of state.lines.filter((l) => l.statementId === id && l.stage === 'PAID')) {
        line.stage = 'BILLED';
        line.billedAt = issuedAt;
      }
      return toStatement(state, record);
    },

    async writeOffStatement(id, input) {
      await delay(350);
      const state = getState();
      const record = requireStatement(state, id);
      if (record.status !== 'ISSUED' && record.status !== 'PARTIALLY_RECONCILED') {
        throw conflict('Only an issued statement can be written off.', 'STATEMENT_NOT_WRITABLE');
      }
      if (!input.reason.trim()) throw invalid('Enter a reason.', { reason: 'Enter a reason.' });
      record.status = 'WRITTEN_OFF';
      record.writeOffReason = input.reason.trim();
      return toStatement(state, record);
    },
  };
}
