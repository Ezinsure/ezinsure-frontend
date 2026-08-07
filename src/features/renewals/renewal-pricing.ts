/**
 * Renewal domain helpers — 1% of net premium deducted from agent commission.
 */
export const RENEWAL_DISCOUNT_RATE = 0.01;

export interface RenewalPricingInput {
  /** Net premium the client pays before renewal discount. */
  netPremium: number;
  /** Agent / vet commission on the renewed policy before discount. */
  agentCommission: number;
}

export interface RenewalPricingBreakdown {
  netPremium: number;
  discountAmount: number;
  expectedPaymentAmount: number;
  agentCommissionBeforeDiscount: number;
  agentCommissionAfterDiscount: number;
  discountRate: number;
}

export function computeRenewalPricing(input: RenewalPricingInput): RenewalPricingBreakdown {
  const netPremium = Math.max(0, Math.round(input.netPremium));
  const agentCommissionBeforeDiscount = Math.max(0, Math.round(input.agentCommission));
  const discountAmount = Math.round(netPremium * RENEWAL_DISCOUNT_RATE);
  const expectedPaymentAmount = Math.max(0, netPremium - discountAmount);
  const agentCommissionAfterDiscount = Math.max(
    0,
    agentCommissionBeforeDiscount - discountAmount,
  );

  return {
    netPremium,
    discountAmount,
    expectedPaymentAmount,
    agentCommissionBeforeDiscount,
    agentCommissionAfterDiscount,
    discountRate: RENEWAL_DISCOUNT_RATE,
  };
}
