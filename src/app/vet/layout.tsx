'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/shared/layouts/AuthenticatedLayout';

export default function VetLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['VETERINARY']}>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </ProtectedRoute>
  );
}
