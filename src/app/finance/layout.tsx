'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['FINANCE']}>
     {children}
    </ProtectedRoute>
  );
} 