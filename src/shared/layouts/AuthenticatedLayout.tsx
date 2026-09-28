'use client';

import type { ReactNode } from 'react';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { AppShell } from '@/shared/layouts/AppShell';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
