/**
 * Livestock finance (vet commission settlement) API route builders.
 *
 * Backend contract — all endpoints require auth (Bearer token).
 * Query dates use ISO `YYYY-MM-DD`. `applicationStatus` filter values:
 * `READY_TO_BE_PAID` | `PAYMENT_INITIATED` | `PAID` | `ALL`.
 */

import type { LivestockFinanceApplicationStatusFilter } from './domain';

export type LivestockFinanceRangeParams = {
  startDate: string;
  endDate: string;
  applicationStatus?: LivestockFinanceApplicationStatusFilter;
};

export const LIVESTOCK_FINANCE_ENDPOINTS = {
  /**
   * GET — aggregate stats for the finance dashboard cards.
   * Response: `{ totalCommission, totalApplications, totalVets, totalNetPremium? }`
   * or `{ data: { ... } }`.
   */
  getLivestockFinanceVetStats: ({
    startDate,
    endDate,
    applicationStatus = 'READY_TO_BE_PAID',
  }: LivestockFinanceRangeParams): string => {
    const search = new URLSearchParams({ startDate, endDate, applicationStatus });
    return `/getLivestockFinanceVetStats?${search.toString()}`;
  },

  /**
   * GET — per-vet commission breakdown for a date range and status filter.
   * Response: array of vet totals (see LivestockFinanceVetTotals field mapping in api.ts)
   * or `{ data: [...] }`.
   */
  getVetsCommissionBreakdown: ({
    startDate,
    endDate,
    applicationStatus = 'READY_TO_BE_PAID',
  }: LivestockFinanceRangeParams): string => {
    const search = new URLSearchParams({ startDate, endDate, applicationStatus });
    return `/getVetsCommissionBreakdown?${search.toString()}`;
  },

  /**
   * GET — applications for one vet in a finance context.
   * Response: `{ data: LivestockFinanceApplication[], totalApplications, totalCommission }`.
   */
  getApplicationsByVetFinance: ({
    vetId,
    startDate,
    endDate,
    applicationStatus = 'READY_TO_BE_PAID',
  }: LivestockFinanceRangeParams & { vetId: string }): string => {
    const search = new URLSearchParams({
      vetId,
      startDate,
      endDate,
      applicationStatus,
    });
    return `/getApplicationsByVetFinance?${search.toString()}`;
  },

  /**
   * PUT — initiate payment for all READY_TO_BE_PAID applications in the date range.
   * Moves applications to PAYMENT_INITIATED and snapshots commission values.
   * Query: startDate, endDate.
   */
  initiateLivestockPayment: (startDate: string, endDate: string): string => {
    const search = new URLSearchParams({ startDate, endDate });
    return `/initiateLivestockPayment?${search.toString()}`;
  },

  /**
   * PUT — mark PAYMENT_INITIATED applications in the date range as PAID.
   * Query: startDate, endDate.
   */
  markLivestockAsPaid: (startDate: string, endDate: string): string => {
    const search = new URLSearchParams({ startDate, endDate });
    return `/markLivestockAsPaid?${search.toString()}`;
  },

  /**
   * GET — paid commission batches grouped by month for a calendar year.
   * Response: `[{ month, totalMonthPaid, vets: [{ vet, totalPaid }] }]`
   * or `{ data: [...] }`. Month names: January … December.
   */
  getLivestockPaidBatchesByYear: (year: number): string => {
    const search = new URLSearchParams({ year: String(year) });
    return `/getLivestockPaidBatchesByYear?${search.toString()}`;
  },

  /**
   * GET — payment-initiated applications for one vet (frozen snapshot values).
   * Query: vetId, startDate, endDate, applicationStatus=PAYMENT_INITIATED.
   */
  getLivestockPaymentInitiatedApplicationsByVet: ({
    vetId,
    startDate,
    endDate,
  }: Omit<LivestockFinanceRangeParams, 'applicationStatus'> & { vetId: string }): string => {
    const search = new URLSearchParams({
      vetId,
      startDate,
      endDate,
      applicationStatus: 'PAYMENT_INITIATED',
    });
    return `/getLivestockPaymentInitiatedApplicationsByVet?${search.toString()}`;
  },
} as const;
