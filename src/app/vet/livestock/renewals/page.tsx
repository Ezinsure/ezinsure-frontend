'use client';

import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function VetLivestockRenewalsPage() {
  return (
      <RenewalsWorkspacePage
      module="livestock"
      title="Livestock renewals"
      subtitle="Find clients whose livestock cover is expiring, review the renewal discount, and renew."
      formBasePath="/vet/livestock/renewals"
    />
  );
}
