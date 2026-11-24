import type { FinanceLedgerApi } from '../api/types';
import { buildFixtures } from './fixtures';
import { createPayoutWrites } from './payout-writes';
import { createReadApi } from './read-api';
import { createReceiptWrites } from './receipt-writes';
import { createRemittanceImport } from './remittance';
import type { MockState } from './state';
import { createStatementWrites } from './statement-writes';

/** Builds an independent, in-memory implementation of the finance ledger contract. */
export function createMockFinanceLedgerApi(initial: MockState = buildFixtures()): FinanceLedgerApi {
  const getState = () => initial;
  const read = createReadApi(getState);
  return {
    ...read,
    ...createPayoutWrites(getState),
    ...createStatementWrites(getState, read.getStatementIssueChecks),
    ...createRemittanceImport(getState),
    ...createReceiptWrites(getState),
  };
}

let singleton: FinanceLedgerApi | undefined;

/** Shared across the app so demo changes persist until the page is reloaded. */
export function getMockFinanceLedgerApi(): FinanceLedgerApi {
  singleton ??= createMockFinanceLedgerApi();
  return singleton;
}
