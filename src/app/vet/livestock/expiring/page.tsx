'use client';

/**
 * Vet follow-up view for clients whose livestock cover is expiring.
 * Reuses the renewals workspace with livestock-scoped copy.
 */
import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function VetExpiringLivestockPage() {
  return (
      <RenewalsWorkspacePage
      module="livestock"
      title="Expiring client insurances"
      subtitle="Follow up with clients you applied for whose livestock insurance is ending soon. Select a policy to renew with the 1% discount."
      formBasePath="/vet/livestock/renewals"
    />
  );
}
