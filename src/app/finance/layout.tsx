'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { FinanceMockProvider } from '@/components/ui/finance/finance-mock-provider';

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['FINANCE']}>
      <FinanceMockProvider>{children}</FinanceMockProvider>
    </ProtectedRoute>
  );
} 