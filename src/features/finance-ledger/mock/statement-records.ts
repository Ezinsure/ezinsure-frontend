import { monthPeriod, parseDateOnly, toDateOnly, type DateOnly } from '../domain';
import { toIso } from './helpers';
import { MOCK_MODULE, type MockState, type StatementRecord } from './state';

const coversDate = (s: StatementRecord, date: DateOnly): boolean =>
  s.periodFrom <= date && date <= s.periodTo;

function openStatementFor(state: MockState, date: DateOnly): StatementRecord | undefined {
  return state.statements.find((s) => s.status === 'OPEN' && coversDate(s, date));
}

/**
 * The statement a line paid on `paidDate` belongs to: the open statement for
 * that month. If that month is already issued, the line is late and joins the
 * open statement of the current month instead (created on demand).
 */
export function findOrCreateOpenStatement(state: MockState, paidDate: DateOnly): StatementRecord {
  const open = openStatementFor(state, paidDate);
  if (open) return open;

  const monthIsClosed = state.statements.some((s) => coversDate(s, paidDate));
  const target = monthIsClosed ? toDateOnly(state.now) : paidDate;
  const targetOpen = openStatementFor(state, target);
  if (targetOpen) return targetOpen;

  const date = parseDateOnly(target);
  const period = monthPeriod(date.getFullYear(), date.getMonth());
  const record: StatementRecord = {
    id: `stm-${period.key}`,
    statementNumber: `STM-${period.key}`,
    module: MOCK_MODULE,
    periodFrom: period.from,
    periodTo: period.to,
    status: 'OPEN',
    createdAt: toIso(state.now),
  };
  state.statements.push(record);
  return record;
}
