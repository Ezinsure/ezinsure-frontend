'use client';

import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function AdminMotorRenewalsPage() {
  return (
    <RenewalsWorkspacePage
      module="motor"
      title="Motor renewals"
      subtitle="Follow up on upcoming motor cover, then renew only expired policies. A plate with another active insurance cannot be renewed."
      formBasePath="/admin/motor/renewals"
    />
  );
}
