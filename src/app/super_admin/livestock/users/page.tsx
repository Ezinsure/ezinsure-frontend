'use client';

import { LivestockUsersPage } from '@/features/admin-livestock-users/livestock-users-page';

export default function SuperAdminLivestockUsersPage() {
  return <LivestockUsersPage viewerRole="SUPER_ADMIN" />;
}
