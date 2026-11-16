import type { LedgerLine, PayableVetRow, PayoutVetRow } from '../domain';
import { MOCK_CURRENCY } from './state';

/** Groups lines by vet; shared by payables, payouts and statements. */
export function aggregateVets(lines: readonly LedgerLine[]): PayoutVetRow[] {
  const byVet = new Map<string, PayoutVetRow>();
  for (const line of lines) {
    const row = byVet.get(line.vet.id) ?? {
      ...line.vet,
      lineCount: 0,
      netPremium: 0,
      amount: 0,
    };
    row.lineCount += 1;
    row.netPremium += line.netPremium;
    row.amount += line.vetCommission;
    byVet.set(line.vet.id, row);
  }
  return [...byVet.values()].sort((a, b) => b.amount - a.amount);
}

export const toPayableRows = (lines: readonly LedgerLine[]): PayableVetRow[] =>
  aggregateVets(lines).map((row) => ({ ...row, currency: MOCK_CURRENCY }));
