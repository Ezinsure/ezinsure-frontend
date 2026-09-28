'use client';

import { ProspectsWorkspacePage } from '@/features/prospects/prospects-workspace-page';

export default function FinanceMotorProspectsPage() {
  return (
    <ProspectsWorkspacePage
      title="Prospects"
      subtitle="View acquisition leads across agents. Finance can review pipeline; agents own day-to-day follow-up."
      enableStaffFilters
      canCreate={false}
      canEdit={false}
      canDelete={false}
    />
  );
}
