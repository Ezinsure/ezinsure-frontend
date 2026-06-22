'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/shared/layouts/AuthenticatedLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </ProtectedRoute>
  );
}