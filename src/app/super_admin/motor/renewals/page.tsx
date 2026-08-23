'use client';

import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function SuperAdminMotorRenewalsPage() {
  return (
    <RenewalsWorkspacePage
      module="motor"
      title="Motor renewals"
      subtitle="Organisation-wide motor renewals. Upcoming policies are for follow-up only; expired policies can be renewed unless the plate already has active cover."
      formBasePath="/super_admin/motor/renewals"
      enableStaffFilters
    />
  );
}
