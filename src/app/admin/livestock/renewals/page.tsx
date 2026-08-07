'use client';

import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function AdminLivestockRenewalsPage() {
  return (
    <RenewalsWorkspacePage
      module="livestock"
      title="Livestock renewals"
      subtitle="Process livestock renewals with the 1% net-premium discount deducted from agent commission."
    />
  );
}
