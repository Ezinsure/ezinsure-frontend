import type { LedgerLine, Mismatch, MismatchKind } from '../domain';
import { MOCK_CURRENCY, MOCK_MODULE, nextSeq, pad, type MockState, type StatementRecord } from './state';

export interface RecordMismatchInput {
  kind: MismatchKind;
  statement: StatementRecord;
  receiptId?: string;
  /** Absent for `NOT_IN_OUR_RECORDS`. */
  line?: LedgerLine;
  contractNumber: string;
  vetName?: string;
  expectedAmount: number;
  sonarwaAmount: number;
  createdAt: string;
}

/**
 * Creates a mismatch and keeps the line in step: an open mismatch flags the
 * line, and a line SONARWA never paid for moves to DISPUTED.
 */
export function recordMismatch(
  state: MockState,
  input: RecordMismatchInput,
  overrides: Partial<Mismatch> = {},
): Mismatch {
  const mismatch: Mismatch = {
    id: `mm-${pad(nextSeq(state, 'mismatch'))}`,
    module: MOCK_MODULE,
    kind: input.kind,
    status: 'OPEN',
    currency: MOCK_CURRENCY,
    statementId: input.statement.id,
    statementNumber: input.statement.statementNumber,
    receiptId: input.receiptId,
    lineId: input.line?.id,
    contractNumber: input.contractNumber,
    vetName: input.vetName,
    expectedAmount: input.expectedAmount,
    sonarwaAmount: input.sonarwaAmount,
    differenceAmount: input.sonarwaAmount - input.expectedAmount,
    createdAt: input.createdAt,
    ...overrides,
  };
  state.mismatches.push(mismatch);

  const { line } = input;
  if (line && mismatch.status === 'OPEN') {
    line.hasOpenMismatch = true;
    line.openMismatchId = mismatch.id;
    line.mismatchAmount = mismatch.differenceAmount;
    if (mismatch.kind === 'MISSING_FROM_SONARWA') line.stage = 'DISPUTED';
  }
  return mismatch;
}
