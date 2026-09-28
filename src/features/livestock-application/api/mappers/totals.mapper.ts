import type { ApplicationPremiumTotals } from '@/features/livestock-application/domain/application-types';
import { computePremiumPercentage } from '@/features/livestock-application/api/mappers/status.mapper';
import { normalizeCompanyCommissionRatePercent } from '@/features/livestock-application/domain/commission-rates';
import { computeCompanyCommissionAmount } from '@/features/livestock-application/utils/premium-calculations';

/** Merge root-level premium fields with optional nested `totals` from API detail responses. */
export function readPackageTotals(record: Record<string, unknown>): ApplicationPremiumTotals {
  const nested = (record.totals as Record<string, unknown> | undefined) ?? {};

  const premiumRateAmount = Number(record.premiumRateAmount ?? nested.premiumRateAmount ?? 0);
  const farmerContributionAmount = Number(
    record.farmerContributionAmount ?? nested.farmerContributionAmount ?? 0,
  );
  const governmentContribution = Number(
    record.governmentContribution ?? nested.governmentContribution ?? 0,
  );
  const companyCommissionRate = normalizeCompanyCommissionRatePercent(
    record.companyCommissionRate ??
      nested.companyCommissionRate ??
      record.companyCommissionPercent ??
      nested.companyCommissionPercent,
  );
  let companyCommission = Math.round(
    Number(record.companyCommission ?? nested.companyCommission ?? 0),
  );
  if (companyCommission <= 0 && premiumRateAmount > 0) {
    companyCommission = computeCompanyCommissionAmount(premiumRateAmount, companyCommissionRate);
  }
  const veterinaryCommission = Math.round(
    Number(record.veterinaryCommission ?? nested.veterinaryCommission ?? 0),
  );
  const totalSumAssured = Number(record.totalSumAssured ?? nested.totalSumAssured ?? 0);

  const explicitPremiumPercentage = Number(record.premiumPercentage ?? nested.premiumPercentage ?? 0);
  const premiumPercentage =
    explicitPremiumPercentage > 0
      ? explicitPremiumPercentage
      : computePremiumPercentage(premiumRateAmount, totalSumAssured);

  return {
    premiumRateAmount,
    farmerContributionAmount,
    governmentContribution,
    companyCommissionRate,
    companyCommission,
    veterinaryCommission,
    totalSumAssured,
    premiumPercentage,
  };
}
