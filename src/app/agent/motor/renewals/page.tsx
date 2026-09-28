'use client';

import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function AgentMotorRenewalsPage() {
  return (
    <RenewalsWorkspacePage
      module="motor"
      title="Motor renewals"
      subtitle="Follow up on your clients' upcoming motor cover, then renew only after it expires. A plate with another active insurance cannot be renewed."
      formBasePath="/agent/motor/renewals"
    />
  );
}
