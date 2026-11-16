import type { Statement } from '../domain';
import { StatusChip } from '../ui/status-chip';
import { statementHealth } from './statement-health';

export function StatementStatusChip({ statement }: { statement: Statement }) {
  const health = statementHealth(statement);
  return <StatusChip label={health.label} tone={health.tone} description={health.description} />;
}
