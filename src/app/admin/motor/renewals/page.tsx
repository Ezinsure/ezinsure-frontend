'use client';

import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function AdminMotorRenewalsPage() {
  return (
      <RenewalsWorkspacePage
      module="motor"
      title="Motor renewals"
      subtitle="Review expiring motor applications and process renewals with the standard 1% discount."
      formBasePath="/admin/motor/renewals"
    />
  );
}
