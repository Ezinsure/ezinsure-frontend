'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { FinanceMockProvider } from '@/components/ui/finance/finance-mock-provider';
import { AuthenticatedLayout } from '@/shared/layouts/AuthenticatedLayout';

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['FINANCE']}>
      <FinanceMockProvider>
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      </FinanceMockProvider>
    </ProtectedRoute>
  );
} 