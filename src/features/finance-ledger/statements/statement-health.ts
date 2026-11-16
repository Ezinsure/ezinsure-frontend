import { overdueLevel, type StageTone, type Statement } from '../domain';

export interface StatementHealth {
  label: string;
  tone: StageTone;
  description: string;
}

/** Plain-language status for a statement row or drawer header. */
export function statementHealth(statement: Statement): StatementHealth {
  if (statement.status === 'OPEN') {
    return statement.lineCount === 0
      ? {
          label: 'Open · empty',
          tone: 'slate',
          description: 'No paid lines in this period yet.',
        }
      : {
          label: 'Ready to issue',
          tone: 'sky',
          description: 'Paid lines are waiting to be billed to SONARWA.',
        };
  }
  if (statement.status === 'WRITTEN_OFF') {
    return {
      label: 'Written off',
      tone: 'slate',
      description: statement.writeOffReason ?? 'The remaining balance was written off.',
    };
  }
  if (statement.openMismatchCount > 0) {
    return {
      label: 'Differences to review',
      tone: 'amber',
      description: 'SONARWA paid amounts that differ from ours.',
    };
  }
  if (statement.outstandingAmount < 0) {
    return { label: 'Overpaid', tone: 'amber', description: 'SONARWA has paid more than we billed.' };
  }
  if (statement.outstandingAmount === 0) {
    return { label: 'Matched', tone: 'emerald', description: 'SONARWA has paid exactly what we billed.' };
  }
  const level = overdueLevel(statement.ageDays);
  if (level === 'critical') {
    return { label: 'Overdue', tone: 'rose', description: 'SONARWA has owed this for a very long time.' };
  }
  if (level === 'warning') {
    return { label: 'Overdue', tone: 'amber', description: 'SONARWA has owed this for a long time.' };
  }
  if (statement.status === 'PARTIALLY_RECONCILED') {
    return {
      label: 'Partly paid',
      tone: 'orange',
      description: 'SONARWA has paid some of this statement.',
    };
  }
  return {
    label: 'Awaiting SONARWA',
    tone: 'orange',
    description: 'Issued and waiting for SONARWA to pay.',
  };
}
