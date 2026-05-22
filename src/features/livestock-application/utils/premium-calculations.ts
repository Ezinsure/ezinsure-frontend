import type { LivestockAnimalRow, LivestockApplicationFormValues } from '@/features/livestock-application/types';

/** Share of total premium (100%) */
export const PREMIUM_FARMER_SHARE = 0.6;
export const PREMIUM_GOVERNMENT_SHARE = 0.4;
export const COMPANY_COMMISSION_RATE = 0.035;
export const VETERINARY_COMMISSION_RATE = 0.1;

export interface PremiumAmountBreakdown {
  premiumRateAmount: string;
  farmerContributionAmount: string;
  governmentContribution: string;
  companyCommission: string;
  veterinaryCommission: string;
}

function parseAmount(value: string): number {
  const n = parseFloat(String(value).replace(/\s/g, '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function formatRwfAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return String(Math.round(amount));
}

export function sumLivestockSumAssured(items: LivestockAnimalRow[]): number {
  return items.reduce((sum, item) => sum + parseAmount(item.sumAssured), 0);
}

/** Total premium (100%) from sum assured × rate % */
export function calculateTotalPremiumRwf(
  sumAssuredTotal: number,
  premiumPercentage: string,
): number {
  const rate = parseAmount(premiumPercentage);
  if (sumAssuredTotal <= 0 || rate <= 0) return 0;
  return Math.round(sumAssuredTotal * (rate / 100));
}

/** Split total premium into farmer, government, and commissions */
export function splitPremiumAmounts(totalPremiumRwf: number): PremiumAmountBreakdown {
  if (totalPremiumRwf <= 0) {
    return {
      premiumRateAmount: '',
      farmerContributionAmount: '',
      governmentContribution: '',
      companyCommission: '',
      veterinaryCommission: '',
    };
  }

  const farmer = Math.round(totalPremiumRwf * PREMIUM_FARMER_SHARE);
  const government = Math.round(totalPremiumRwf * PREMIUM_GOVERNMENT_SHARE);
  const company = Math.round(totalPremiumRwf * COMPANY_COMMISSION_RATE);
  const veterinary = Math.round(totalPremiumRwf * VETERINARY_COMMISSION_RATE);

  return {
    premiumRateAmount: formatRwfAmount(totalPremiumRwf),
    farmerContributionAmount: formatRwfAmount(farmer),
    governmentContribution: formatRwfAmount(government),
    companyCommission: formatRwfAmount(company),
    veterinaryCommission: formatRwfAmount(veterinary),
  };
}

export function computePremiumBreakdownFromForm(
  values: Pick<
    LivestockApplicationFormValues,
    'livestockItems' | 'premiumPercentage' | 'premiumRateAmount'
  >,
  options?: { useManualTotal?: boolean },
): PremiumAmountBreakdown {
  const manualTotal = parseAmount(values.premiumRateAmount);
  const totalPremium =
    options?.useManualTotal && manualTotal > 0
      ? manualTotal
      : calculateTotalPremiumRwf(
          sumLivestockSumAssured(values.livestockItems),
          values.premiumPercentage,
        );

  return splitPremiumAmounts(totalPremium);
}
