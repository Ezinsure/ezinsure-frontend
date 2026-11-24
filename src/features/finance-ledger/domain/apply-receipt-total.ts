import type { MoneyAmount } from './common';

/** Minimal line shape needed to apply a total to billed lines. */
export interface PayableLineRef {
  lineId: string;
  expectedAmount: MoneyAmount;
  /** ISO / date string used to order oldest first. */
  paidAt: string;
  contractNumber?: string;
  vetName?: string;
  statementId?: string;
}

export interface AppliedLine {
  lineId: string;
  contractNumber?: string;
  vetName?: string;
  statementId?: string;
  expectedAmount: MoneyAmount;
  /** What this receipt applies to the line (may be less than expected). */
  appliedAmount: MoneyAmount;
  fullyCovered: boolean;
}

export interface ApplyReceiptTotalResult {
  applied: AppliedLine[];
  /** Lines that stay billed because the total ran out. */
  remainingLineCount: number;
  fullyCoveredCount: number;
  partiallyCoveredCount: number;
  appliedAmount: MoneyAmount;
  /** Allocation left after whole lines — usually 0 once a partial line takes the rest. */
  unappliedAmount: MoneyAmount;
}

/**
 * Applies a lump-sum receipt to billed lines, oldest `paidAt` first.
 * Whole lines are covered first; any leftover that cannot cover the next
 * line in full is applied as a partial payment on that next line.
 */
export function applyReceiptTotalToLines(
  lines: readonly PayableLineRef[],
  allocationAmount: MoneyAmount,
): ApplyReceiptTotalResult {
  const ordered = [...lines].sort((a, b) => a.paidAt.localeCompare(b.paidAt));
  let remaining = allocationAmount;
  const applied: AppliedLine[] = [];

  for (const line of ordered) {
    if (remaining <= 0) break;
    if (remaining >= line.expectedAmount) {
      applied.push({
        lineId: line.lineId,
        contractNumber: line.contractNumber,
        vetName: line.vetName,
        statementId: line.statementId,
        expectedAmount: line.expectedAmount,
        appliedAmount: line.expectedAmount,
        fullyCovered: true,
      });
      remaining -= line.expectedAmount;
    } else {
      applied.push({
        lineId: line.lineId,
        contractNumber: line.contractNumber,
        vetName: line.vetName,
        statementId: line.statementId,
        expectedAmount: line.expectedAmount,
        appliedAmount: remaining,
        fullyCovered: false,
      });
      remaining = 0;
    }
  }

  return {
    applied,
    remainingLineCount: ordered.length - applied.length,
    fullyCoveredCount: applied.filter((a) => a.fullyCovered).length,
    partiallyCoveredCount: applied.filter((a) => !a.fullyCovered).length,
    appliedAmount: allocationAmount - remaining,
    unappliedAmount: remaining,
  };
}
