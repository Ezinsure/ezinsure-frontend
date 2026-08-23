/**
 * Renewal domain helpers — 1% of net premium discount.
 *
 * Attribution:
 * - Default: deduct from company commission.
 * - If the application was brought in by an agent (or livestock vet): deduct from
 *   that producer’s commission instead.
 */
export const RENEWAL_DISCOUNT_RATE = 0.01;

export type RenewalDiscountBearer = 'agent' | 'company';

export interface RenewalPricingInput {
  /** Net premium the client pays before renewal discount. */
  netPremium: number;
  /** Agent / vet commission on the renewed policy before discount. */
  agentCommission: number;
  /** Company commission before discount. */
  companyCommission?: number;
  /**
   * Explicit bearer. When omitted, derived from `hasOriginatingAgent`
   * (agent → agent commission; otherwise → company).
   */
  discountBearer?: RenewalDiscountBearer;
  /** True when an agent (motor) or vet (livestock) originated the application. */
  hasOriginatingAgent?: boolean;
}

export interface RenewalPricingBreakdown {
  netPremium: number;
  discountAmount: number;
  expectedPaymentAmount: number;
  discountBearer: RenewalDiscountBearer;
  agentCommissionBeforeDiscount: number;
  agentCommissionAfterDiscount: number;
  companyCommissionBeforeDiscount: number;
  companyCommissionAfterDiscount: number;
  discountRate: number;
}

export function resolveRenewalDiscountBearer(
  input: Pick<RenewalPricingInput, 'discountBearer' | 'hasOriginatingAgent'>,
): RenewalDiscountBearer {
  if (input.discountBearer === 'agent' || input.discountBearer === 'company') {
    return input.discountBearer;
  }
  return input.hasOriginatingAgent ? 'agent' : 'company';
}

export function computeRenewalPricing(input: RenewalPricingInput): RenewalPricingBreakdown {
  const netPremium = Math.max(0, Math.round(input.netPremium));
  const agentCommissionBeforeDiscount = Math.max(0, Math.round(input.agentCommission));
  const companyCommissionBeforeDiscount = Math.max(0, Math.round(input.companyCommission ?? 0));
  const discountAmount = Math.round(netPremium * RENEWAL_DISCOUNT_RATE);
  const expectedPaymentAmount = Math.max(0, netPremium - discountAmount);
  const discountBearer = resolveRenewalDiscountBearer(input);

  const agentCommissionAfterDiscount =
    discountBearer === 'agent'
      ? Math.max(0, agentCommissionBeforeDiscount - discountAmount)
      : agentCommissionBeforeDiscount;

  const companyCommissionAfterDiscount =
    discountBearer === 'company'
      ? Math.max(0, companyCommissionBeforeDiscount - discountAmount)
      : companyCommissionBeforeDiscount;

  return {
    netPremium,
    discountAmount,
    expectedPaymentAmount,
    discountBearer,
    agentCommissionBeforeDiscount,
    agentCommissionAfterDiscount,
    companyCommissionBeforeDiscount,
    companyCommissionAfterDiscount,
    discountRate: RENEWAL_DISCOUNT_RATE,
  };
}

export function renewalDiscountBearerLabel(
  bearer: RenewalDiscountBearer,
  module: 'motor' | 'livestock' = 'motor',
): string {
  if (bearer === 'company') return 'company commission';
  return module === 'livestock' ? 'veterinary commission' : 'agent commission';
}
