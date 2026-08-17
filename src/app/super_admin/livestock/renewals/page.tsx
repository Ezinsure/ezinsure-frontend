'use client';

import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function SuperAdminLivestockRenewalsPage() {
  return (
    <RenewalsWorkspacePage
      module="livestock"
      title="Livestock renewals"
      subtitle="Organisation-wide livestock renewals. Upcoming policies are for follow-up only; only expired applications can be renewed."
      formBasePath="/super_admin/livestock/renewals"
    />
  );
}
