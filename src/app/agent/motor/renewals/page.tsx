'use client';

import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function AgentMotorRenewalsPage() {
  return (
    <RenewalsWorkspacePage
      module="motor"
      title="Motor renewals"
      subtitle="Find expiring motor policies, review the 1% renewal discount, and proceed with renewal."
    />
  );
}
