'use client';

import { LivestockWorkspaceDashboard } from '@/features/livestock-application/livestock-workspace-dashboard';

export default function SuperAdminLivestockDashboardPage() {
  return (
    <LivestockWorkspaceDashboard
      title="Livestock dashboard"
      subtitle="Organisation-wide livestock insurance performance for the selected date range."
      scope="all"
    />
  );
}
