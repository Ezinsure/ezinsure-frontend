'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>{children}</ProtectedRoute>;
} 