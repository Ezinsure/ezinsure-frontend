import {
  overdueLevel,
  type DateOnly,
  type FinanceSummary,
  type MoneyAmount,
} from '../domain';

export type AttentionSeverity = 'critical' | 'warning' | 'info';

export interface AttentionItem {
  id: string;
  severity: AttentionSeverity;
  title: string;
  detail?: string;
  /** Money involved, formatted by the view. */
  amount?: MoneyAmount;
}

export interface AttentionInput {
  summary: FinanceSummary;
  /** Approved lines waiting for a payout (not limited to the period). */
  readyLineCount: number;
  /** Payouts prepared but not yet marked paid (not limited to the period). */
  preparedPayoutCount: number;
  today: DateOnly;
}

const SEVERITY_ORDER: Record<AttentionSeverity, number> = { critical: 0, warning: 1, info: 2 };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The short to-do list on Finance Home, most urgent first. */
export function buildAttentionItems({
  summary,
  readyLineCount,
  preparedPayoutCount,
  today,
}: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const row of summary.rows) {
    if (row.statementId && row.statementStatus === 'OPEN' && row.paidLineCount > 0 && row.to < today) {
      items.push({
        id: `unissued-${row.periodKey}`,
        severity: 'warning',
        title: `${row.statementNumber} is ready to issue`,
        detail: `The month has ended and ${plural(row.paidLineCount, 'line')} paid to vets ${row.paidLineCount === 1 ? 'has' : 'have'} not been billed to SONARWA.`,
      });
    }
    const level = overdueLevel(row.ageDays);
    if (row.outstandingAmount > 0 && level !== 'ok') {
      items.push({
        id: `overdue-${row.periodKey}`,
        severity: level === 'critical' ? 'critical' : 'warning',
        title: `${row.statementNumber} unpaid for ${row.ageDays} days`,
        detail: 'SONARWA has not paid this statement in full.',
        amount: row.outstandingAmount,
      });
    }
  }

  if (summary.totals.openMismatchCount > 0) {
    items.push({
      id: 'mismatches',
      severity: 'warning',
      title: `${plural(summary.totals.openMismatchCount, 'difference')} need a reason`,
      detail: 'SONARWA paid amounts that differ from ours.',
      amount: summary.totals.openMismatchAmount,
    });
  }
  if (preparedPayoutCount > 0) {
    items.push({
      id: 'prepared-payouts',
      severity: 'warning',
      title: `${plural(preparedPayoutCount, 'payout')} prepared but not marked paid`,
      detail: 'Mark them paid once the money has been sent to the vets.',
    });
  }
  if (readyLineCount > 0) {
    items.push({
      id: 'ready-lines',
      severity: 'info',
      title: `${plural(readyLineCount, 'line')} approved and ready to pay`,
      detail: 'Prepare a payout to pay the vets.',
    });
  }

  return items.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
