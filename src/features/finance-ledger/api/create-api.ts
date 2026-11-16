import { createFinanceHttp, type ApiFetch } from './http';
import { createLedgerApi } from './ledger.api';
import { createMismatchesApi } from './mismatches.api';
import { createPayoutsApi } from './payouts.api';
import { createReceiptsApi } from './receipts.api';
import { createStatementsApi } from './statements.api';
import { createSummaryApi } from './summary.api';
import type { FinanceLedgerApi } from './types';

/** Real HTTP implementation of the finance ledger contract. */
export function createFinanceLedgerApi(apiFetch: ApiFetch): FinanceLedgerApi {
  const http = createFinanceHttp(apiFetch);
  return {
    ...createSummaryApi(http),
    ...createLedgerApi(http),
    ...createPayoutsApi(http),
    ...createStatementsApi(http),
    ...createReceiptsApi(http),
    ...createMismatchesApi(http),
  };
}
