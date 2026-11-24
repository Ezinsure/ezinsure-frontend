import { overdueLevel, type PeriodSummaryRow, type StageTone } from '../domain';

export interface PeriodHealth {
  label: string;
  tone: StageTone;
  /** Plain-language explanation for the tooltip. */
  description: string;
}

/**
 * One plain-language verdict for a month, so a finance user never has to
 * compare four columns to know whether the month is done.
 */
export function periodHealth(row: PeriodSummaryRow): PeriodHealth {
  const noStatementYet = !row.statementId || row.statementStatus === 'OPEN';
  if (noStatementYet) {
    return row.paidLineCount === 0
      ? { label: 'No activity', tone: 'slate', description: 'Nothing was paid to vets in this month.' }
      : {
          label: 'Not billed yet',
          tone: 'sky',
          description: 'Vets were paid, but the statement for this month has not been issued to SONARWA.',
        };
  }
  if (row.statementStatus === 'WRITTEN_OFF') {
    return { label: 'Written off', tone: 'slate', description: 'The remaining balance was written off.' };
  }
  if (row.openMismatchCount > 0) {
    return {
      label: 'Differences to review',
      tone: 'amber',
      description: 'SONARWA paid amounts that differ from ours. Add a reason for each difference.',
    };
  }
  if (row.outstandingAmount < 0) {
    return { label: 'Overpaid', tone: 'amber', description: 'SONARWA has paid more than we billed.' };
  }
  if (row.outstandingAmount === 0) {
    return { label: 'Matched', tone: 'emerald', description: 'SONARWA has paid exactly what we billed.' };
  }
  const level = overdueLevel(row.ageDays);
  if (level === 'critical') {
    return { label: 'Overdue', tone: 'rose', description: 'SONARWA has owed this for a very long time.' };
  }
  if (level === 'warning') {
    return { label: 'Overdue', tone: 'amber', description: 'SONARWA has owed this for a long time.' };
  }
  return {
    label: 'Awaiting SONARWA',
    tone: 'orange',
    description: 'Billed to SONARWA and waiting for payment.',
  };
}
