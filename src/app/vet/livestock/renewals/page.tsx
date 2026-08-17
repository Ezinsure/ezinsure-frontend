'use client';

import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function VetLivestockRenewalsPage() {
  return (
    <RenewalsWorkspacePage
      module="livestock"
      title="Livestock renewals"
      subtitle="Follow up on your clients' upcoming livestock cover, then renew only after that application expires."
      formBasePath="/vet/livestock/renewals"
    />
  );
}
