'use client';

import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function SuperAdminMotorRenewalsPage() {
  return (
    <RenewalsWorkspacePage
      module="motor"
      title="Motor renewals"
      subtitle="Organisation-wide motor renewals with discount and commission impact."
      formBasePath="/super_admin/motor/renewals"
    />
  );
}
