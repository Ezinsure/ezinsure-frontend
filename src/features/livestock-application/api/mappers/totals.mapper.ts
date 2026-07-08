import type { ApplicationPremiumTotals } from '@/features/livestock-application/domain/application-types';
import { computePremiumPercentage } from '@/features/livestock-application/api/mappers/status.mapper';

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
  const companyCommission = Math.round(
    Number(record.companyCommission ?? nested.companyCommission ?? 0),
  );
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
    companyCommission,
    veterinaryCommission,
    totalSumAssured,
    premiumPercentage,
  };
}
