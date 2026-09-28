'use client';

import { LivestockWorkspaceDashboard } from '@/features/livestock-application/livestock-workspace-dashboard';

export default function FinanceLivestockDashboardPage() {
  return (
    <LivestockWorkspaceDashboard
      title="Finance livestock dashboard"
      subtitle="Monitor insured animals, agent commissions, and company commission totals by period."
      scope="all"
    />
  );
}
