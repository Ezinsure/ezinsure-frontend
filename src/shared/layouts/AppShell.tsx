'use client';

import { useState, type ReactNode } from 'react';
import { AppSidebar } from '@/shared/layouts/AppSidebar';
import { AppTopBar } from '@/shared/layouts/AppTopBar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--light-gray)]">
      <AppSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppTopBar onOpenMobileSidebar={() => setMobileOpen(true)} />
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
