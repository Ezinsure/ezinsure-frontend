// app/agent/layout.tsx
'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['AGENT']}>{children}</ProtectedRoute>;
}