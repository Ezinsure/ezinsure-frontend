import type { MismatchesApi, ReceiptsApi } from '../api/types';
import {
  applyReceiptTotalToLines,
  hasErrors,
  validateCreateReceipt,
  validateResolveMismatch,
  type CreateReceiptInput,
  type MismatchStatus,
  type Receipt,
  type RemittanceMatchRow,
} from '../domain';
import { conflict, delay, invalid, notFound, toIso } from './helpers';
import { recordMismatch } from './mismatch-factory';
import { toMatchRow } from './remittance';
import { MOCK_ACTOR, MOCK_CURRENCY, MOCK_MODULE, findStatement, nextSeq, pad, type MockState } from './state';
import { recomputeStatementStatus } from './views';

type ReceiptWrites = Pick<ReceiptsApi, 'createReceipt'> & Pick<MismatchesApi, 'resolveMismatch'>;

const RESOLUTION_STATUS = {
  EXPLAIN: 'EXPLAINED',
  REBILL: 'REBILL',
  WRITE_OFF: 'WRITTEN_OFF',
} as const satisfies Record<string, MismatchStatus>;

/** Total-only path: apply each allocation to billed lines oldest first. */
function applyInOrder(state: MockState, input: CreateReceiptInput): RemittanceMatchRow[] {
  const rows: RemittanceMatchRow[] = [];
  for (const allocation of input.allocations) {
    const lines = state.lines
      .filter((l) => l.stage === 'BILLED' && l.statementId === allocation.statementId)
      .map((l) => ({
        lineId: l.id,
        expectedAmount: l.expectedAmount,
        paidAt: l.paidAt ?? l.submittedAt,
        contractNumber: l.contractNumber,
        vetName: l.vet.name,
        statementId: l.statementId,
      }));
    const result = applyReceiptTotalToLines(lines, allocation.amount);
    for (const applied of result.applied) {
      const line = state.lines.find((l) => l.id === applied.lineId);
      if (!line) continue;
      rows.push(toMatchRow(line, applied.appliedAmount, `auto-${rows.length + 1}`));
    }
  }
  return rows;
}

function rowsFor(state: MockState, input: CreateReceiptInput): RemittanceMatchRow[] {
  const importRecord = input.remittanceImportId ? state.imports.get(input.remittanceImportId) : undefined;
  if (input.remittanceImportId && !importRecord) throw notFound('Remittance import');

  const statementIds = new Set(input.allocations.map((a) => a.statementId));
  const base = importRecord
    ? importRecord.rows.filter((r) => !r.statementId || statementIds.has(r.statementId))
    : applyInOrder(state, input);

  const overrides = new Map((input.lineOverrides ?? []).map((o) => [o.lineId, o.sonarwaAmount]));
  return base.map((row) => {
    const line = row.lineId ? state.lines.find((l) => l.id === row.lineId) : undefined;
    const override = row.lineId ? overrides.get(row.lineId) : undefined;
    return line && override !== undefined ? toMatchRow(line, override, row.rowId) : row;
  });
}

export function createReceiptWrites(getState: () => MockState): ReceiptWrites {
  return {
    async createReceipt(input) {
      await delay(450);
      const state = getState();
      const errors = validateCreateReceipt(input, state.now);
      if (hasErrors(errors)) throw invalid('Please correct the highlighted fields.', errors);

      const statements = input.allocations.map((a) => findStatement(state, a.statementId));
      if (statements.some((s) => !s || (s.status !== 'ISSUED' && s.status !== 'PARTIALLY_RECONCILED'))) {
        throw conflict('Receipts can only be allocated to issued statements.', 'STATEMENT_NOT_ISSUED');
      }

      const createdAt = toIso(state.now);
      const receipt: Receipt = {
        id: `rcp-${pad(nextSeq(state, 'receipt-id'))}`,
        receiptNumber: `RCP-${state.now.getFullYear()}-${pad(nextSeq(state, 'receipt'))}`,
        module: MOCK_MODULE,
        currency: MOCK_CURRENCY,
        amount: input.amount,
        receivedAt: input.receivedAt,
        reference: input.reference.trim(),
        allocations: input.allocations.map((a) => ({
          ...a,
          statementNumber: findStatement(state, a.statementId)?.statementNumber,
        })),
        remittanceFileName: input.remittanceImportId
          ? state.imports.get(input.remittanceImportId)?.result.fileName
          : undefined,
        note: input.note?.trim() || undefined,
        mismatchCount: 0,
        createdAt,
        createdBy: MOCK_ACTOR,
      };

      for (const row of rowsFor(state, input)) {
        const line = row.lineId ? state.lines.find((l) => l.id === row.lineId) : undefined;
        const statement = findStatement(state, row.statementId ?? input.allocations[0].statementId);
        if (!statement) continue;
        const base = {
          statement,
          receiptId: receipt.id,
          line,
          contractNumber: row.contractNumber,
          vetName: row.vetName,
          expectedAmount: row.expectedAmount,
          sonarwaAmount: row.sonarwaAmount,
          createdAt,
        };

        if (row.matchStatus === 'MISSING_FROM_SONARWA') {
          recordMismatch(state, { ...base, kind: 'MISSING_FROM_SONARWA' });
          receipt.mismatchCount += 1;
          continue;
        }
        if (line) {
          line.stage = 'REIMBURSED';
          line.reimbursedAt = createdAt;
          line.receivedAmount = row.sonarwaAmount;
        }
        if (row.matchStatus === 'NOT_IN_OUR_RECORDS') {
          recordMismatch(state, { ...base, kind: 'NOT_IN_OUR_RECORDS' });
          receipt.mismatchCount += 1;
        } else if (row.matchStatus === 'AMOUNT_DIFFERS') {
          recordMismatch(state, { ...base, kind: 'AMOUNT_DIFFERS' });
          receipt.mismatchCount += 1;
        } else if (row.differenceAmount !== 0) {
          recordMismatch(state, { ...base, kind: 'AMOUNT_DIFFERS' }, {
            status: 'EXPLAINED',
            reasonCode: 'ROUNDING',
            resolvedAt: createdAt,
            resolvedBy: MOCK_ACTOR,
          });
        }
      }

      state.receipts.push(receipt);
      for (const a of input.allocations) recomputeStatementStatus(state, a.statementId);
      return receipt;
    },

    async resolveMismatch(id, input) {
      await delay(300);
      const state = getState();
      const mismatch = state.mismatches.find((m) => m.id === id);
      if (!mismatch) throw notFound('Mismatch');
      if (mismatch.status !== 'OPEN') {
        throw conflict('This mismatch has already been resolved.', 'MISMATCH_ALREADY_RESOLVED');
      }
      const errors = validateResolveMismatch(input);
      if (hasErrors(errors)) throw invalid('Please correct the highlighted fields.', errors);

      mismatch.status = RESOLUTION_STATUS[input.action];
      mismatch.reasonCode = input.reasonCode;
      mismatch.note = input.note?.trim() || undefined;
      mismatch.resolvedAt = toIso(state.now);
      mismatch.resolvedBy = MOCK_ACTOR;

      const line = state.lines.find((l) => l.id === mismatch.lineId);
      if (line) {
        line.hasOpenMismatch = false;
        line.openMismatchId = undefined;
        line.mismatchAmount = undefined;
        // Not paid by SONARWA: back to "awaiting reimbursement" unless we gave up on it.
        if (line.stage === 'DISPUTED' && input.action !== 'WRITE_OFF') line.stage = 'BILLED';
      }
      recomputeStatementStatus(state, mismatch.statementId);
      return mismatch;
    },
  };
}
