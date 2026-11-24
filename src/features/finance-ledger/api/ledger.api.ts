import { FINANCE_LEDGER_ENDPOINTS as E } from './endpoints';
import { toPaginated, unwrapData, type FinanceHttp } from './http';
import type { DataEnvelope, Paginated } from '../domain/common';
import type { LedgerLine, LedgerLineDetail } from '../domain/ledger';
import type { LedgerApi } from './types';

export const createLedgerApi = (http: FinanceHttp): LedgerApi => ({
  async listLines(query, options) {
    return toPaginated(
      await http.get<Paginated<LedgerLine>>(E.lines(query), options),
    );
  },

  async getLineDetail(lineId, options) {
    return unwrapData(
      await http.get<DataEnvelope<LedgerLineDetail>>(E.lineDetail(lineId), options),
    );
  },
});
