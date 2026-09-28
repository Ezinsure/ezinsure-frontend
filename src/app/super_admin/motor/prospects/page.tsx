'use client';

import { ProspectsWorkspacePage } from '@/features/prospects/prospects-workspace-page';

export default function SuperAdminMotorProspectsPage() {
  return (
    <ProspectsWorkspacePage
      title="Prospects"
      subtitle="Organisation-wide acquisition leads. Monitor agent ownership and automated SMS reminders near expiry."
      enableStaffFilters
    />
  );
}
