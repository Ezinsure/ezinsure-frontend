import { FINANCE_LEDGER_ENDPOINTS as E } from './endpoints';
import { unwrapData, type FinanceHttp } from './http';
import type { DataEnvelope } from '../domain/common';
import type { FinanceSummary } from '../domain/summary';
import type { FinanceSummaryApi } from './types';

export const createSummaryApi = (http: FinanceHttp): FinanceSummaryApi => ({
  async getSummary(query, options) {
    return unwrapData(
      await http.get<DataEnvelope<FinanceSummary>>(E.summary(query), options),
    );
  },
});
