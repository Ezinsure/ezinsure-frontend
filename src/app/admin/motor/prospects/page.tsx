'use client';

import { ProspectsWorkspacePage } from '@/features/prospects/prospects-workspace-page';

export default function AdminMotorProspectsPage() {
  return (
    <ProspectsWorkspacePage
      title="Prospects"
      subtitle="Organisation-wide lead book for motorists on other insurers. Filter by agent and SMS reminder status."
      enableStaffFilters
    />
  );
}
