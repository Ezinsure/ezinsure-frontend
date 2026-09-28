'use client';

import { LivestockWorkspaceDashboard } from '@/features/livestock-application/livestock-workspace-dashboard';

export default function LivestockAdminDashboardPage() {
  return (
    <LivestockWorkspaceDashboard
      title="Livestock dashboard"
      subtitle="Track animals insured, insured value, and commissions across the selected period."
      scope="all"
    />
  );
}
