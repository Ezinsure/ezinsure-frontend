import { FINANCE_LEDGER_ENDPOINTS as E } from './endpoints';
import { toPaginated, unwrapData, type FinanceHttp } from './http';
import type { DataEnvelope, Paginated } from '../domain/common';
import type { PayableVetRow, Payout, PayoutVetRow } from '../domain/payouts';
import type { PayoutsApi } from './types';

export const createPayoutsApi = (http: FinanceHttp): PayoutsApi => ({
  async listPayableVets(query, options) {
    return toPaginated(
      await http.get<Paginated<PayableVetRow>>(E.payables(query), options),
    );
  },

  async listPayouts(query, options) {
    return toPaginated(await http.get<Paginated<Payout>>(E.payouts(query), options));
  },

  async getPayout(id, options) {
    return unwrapData(await http.get<DataEnvelope<Payout>>(E.payout(id), options));
  },

  async listPayoutVets(id, query, options) {
    return toPaginated(
      await http.get<Paginated<PayoutVetRow>>(E.payoutVets(id, query), options),
    );
  },

  async createPayout(input, options) {
    return unwrapData(
      await http.send<DataEnvelope<Payout>>('POST', E.payouts(), input, options),
    );
  },

  async markPayoutPaid(id, input, options) {
    return unwrapData(
      await http.send<DataEnvelope<Payout>>('PUT', E.markPayoutPaid(id), input, options),
    );
  },

  async cancelPayout(id, input, options) {
    return unwrapData(
      await http.send<DataEnvelope<Payout>>('PUT', E.cancelPayout(id), input, options),
    );
  },
});
