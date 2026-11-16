import type { ReceiptsApi } from '../api/types';
import {
  isWithinRoundingTolerance,
  sumAmounts,
  type LedgerLine,
  type RemittanceMatchRow,
  type RemittanceMatchStatus,
} from '../domain';
import { conflict, delay, invalid } from './helpers';
import { findStatement, nextSeq, pad, type MockState } from './state';

/** Classifies one line by comparing what we expected with what SONARWA paid. */
export function classifyAmounts(expected: number, sonarwa: number): RemittanceMatchStatus {
  if (sonarwa === 0 && expected > 0) return 'MISSING_FROM_SONARWA';
  return isWithinRoundingTolerance(sonarwa - expected) ? 'MATCHED' : 'AMOUNT_DIFFERS';
}

export function toMatchRow(line: LedgerLine, sonarwaAmount: number, rowId: string): RemittanceMatchRow {
  return {
    rowId,
    matchStatus: classifyAmounts(line.expectedAmount, sonarwaAmount),
    contractNumber: line.contractNumber,
    lineId: line.id,
    statementId: line.statementId,
    vetName: line.vet.name,
    expectedAmount: line.expectedAmount,
    sonarwaAmount,
    differenceAmount: sonarwaAmount - line.expectedAmount,
  };
}

/** Pretends to be SONARWA's remittance: mostly right, with a few realistic differences. */
function simulateSonarwaAmount(line: LedgerLine, index: number): number {
  if (index % 11 === 5) return 0;
  if (index % 7 === 3) return Math.round(line.expectedAmount * 0.95);
  if (index % 13 === 6) return line.expectedAmount - 1;
  return line.expectedAmount;
}

export function createRemittanceImport(
  getState: () => MockState,
): Pick<ReceiptsApi, 'importRemittance'> {
  return {
    async importRemittance(input) {
      await delay(600);
      const state = getState();
      if (!input.statementIds.length) {
        throw invalid('Choose at least one statement.', { statementIds: 'Choose at least one statement.' });
      }
      const statements = input.statementIds.map((id) => findStatement(state, id));
      if (statements.some((s) => !s || (s.status !== 'ISSUED' && s.status !== 'PARTIALLY_RECONCILED'))) {
        throw conflict('Remittances can only be imported for issued statements.', 'STATEMENT_NOT_ISSUED');
      }

      const billed = state.lines.filter(
        (l) => l.stage === 'BILLED' && l.statementId && input.statementIds.includes(l.statementId),
      );
      const rows = billed.map((line, i) => toMatchRow(line, simulateSonarwaAmount(line, i), `row-${i + 1}`));
      rows.push({
        rowId: `row-${rows.length + 1}`,
        matchStatus: 'NOT_IN_OUR_RECORDS',
        contractNumber: `LS-UNKNOWN-${pad(nextSeq(state, 'unknown'))}`,
        statementId: input.statementIds[0],
        expectedAmount: 0,
        sonarwaAmount: 25_000,
        differenceAmount: 25_000,
      });

      const count = (status: RemittanceMatchStatus) => rows.filter((r) => r.matchStatus === status).length;
      const importId = `imp-${pad(nextSeq(state, 'import'))}`;
      const result = {
        importId,
        fileName: input.file?.name ?? 'remittance.xlsx',
        totals: {
          expectedAmount: sumAmounts(rows.map((r) => r.expectedAmount)),
          sonarwaAmount: sumAmounts(rows.map((r) => r.sonarwaAmount)),
          differenceAmount: sumAmounts(rows.map((r) => r.differenceAmount)),
          matchedCount: count('MATCHED'),
          differsCount: count('AMOUNT_DIFFERS'),
          missingCount: count('MISSING_FROM_SONARWA'),
          unknownCount: count('NOT_IN_OUR_RECORDS'),
        },
      };
      state.imports.set(importId, { result, rows, statementIds: input.statementIds });
      return result;
    },
  };
}
