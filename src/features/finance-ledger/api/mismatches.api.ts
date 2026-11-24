import { FINANCE_LEDGER_ENDPOINTS as E } from './endpoints';
import { toPaginated, unwrapData, type FinanceHttp } from './http';
import type { DataEnvelope, Paginated } from '../domain/common';
import type { Mismatch } from '../domain/mismatches';
import type { MismatchesApi } from './types';

export const createMismatchesApi = (http: FinanceHttp): MismatchesApi => ({
  async listMismatches(query, options) {
    return toPaginated(
      await http.get<Paginated<Mismatch>>(E.mismatches(query), options),
    );
  },

  async resolveMismatch(id, input, options) {
    return unwrapData(
      await http.send<DataEnvelope<Mismatch>>('PUT', E.resolveMismatch(id), input, options),
    );
  },
});
