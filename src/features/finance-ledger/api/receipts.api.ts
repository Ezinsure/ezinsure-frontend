import { FINANCE_LEDGER_ENDPOINTS as E } from './endpoints';
import { toPaginated, unwrapData, type FinanceHttp } from './http';
import type { DataEnvelope, Paginated } from '../domain/common';
import type {
  Receipt,
  RemittanceImportResult,
  RemittanceMatchRow,
} from '../domain/receipts';
import type { ReceiptsApi } from './types';

export const createReceiptsApi = (http: FinanceHttp): ReceiptsApi => ({
  async listReceipts(query, options) {
    return toPaginated(await http.get<Paginated<Receipt>>(E.receipts(query), options));
  },

  async getReceipt(id, options) {
    return unwrapData(await http.get<DataEnvelope<Receipt>>(E.receipt(id), options));
  },

  async importRemittance(input, options) {
    const form = new FormData();
    form.append('file', input.file);
    form.append('module', input.module);
    form.append('statementIds', input.statementIds.join(','));
    return unwrapData(
      await http.postForm<DataEnvelope<RemittanceImportResult>>(
        E.importRemittance(),
        form,
        options,
      ),
    );
  },

  async listRemittanceRows(importId, query, options) {
    return toPaginated(
      await http.get<Paginated<RemittanceMatchRow>>(
        E.remittanceRows(importId, query),
        options,
      ),
    );
  },

  async createReceipt(input, options) {
    return unwrapData(
      await http.send<DataEnvelope<Receipt>>('POST', E.receipts(), input, options),
    );
  },
});
