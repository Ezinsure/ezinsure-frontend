'use client';

import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function SuperAdminLivestockRenewalsPage() {
  return (
    <RenewalsWorkspacePage
      module="livestock"
      title="Livestock renewals"
      subtitle="Organisation-wide livestock renewals and discount tracking."
      formBasePath="/super_admin/livestock/renewals"
    />
  );
}
