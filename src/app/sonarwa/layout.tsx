'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/shared/layouts/AuthenticatedLayout';
import { SONARWA_REPRESENTATIVE_ROLE } from '@/shared/utils/role';

export default function SonarwaLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[SONARWA_REPRESENTATIVE_ROLE]}>
      <div data-portal="sonarwa">
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </div>
    </ProtectedRoute>
  );
}
