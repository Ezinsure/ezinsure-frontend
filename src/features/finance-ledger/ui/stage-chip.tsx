import { LEDGER_STAGE_META, type LedgerStage } from '../domain';
import { StatusChip } from './status-chip';

/** The chip for a line's lifecycle stage, with its plain-language description on hover. */
export function StageChip({ stage, className }: { stage: LedgerStage; className?: string }) {
  const meta = LEDGER_STAGE_META[stage];
  return (
    <StatusChip label={meta.label} tone={meta.tone} description={meta.description} className={className} />
  );
}
