'use client';

import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function AdminLivestockRenewalsPage() {
  return (
    <RenewalsWorkspacePage
      module="livestock"
      title="Livestock renewals"
      subtitle="Follow up on upcoming livestock cover, then renew only expired applications."
      formBasePath="/admin/livestock/renewals"
      enableStaffFilters
    />
  );
}
