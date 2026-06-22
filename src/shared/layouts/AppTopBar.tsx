'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { WorkspaceSwitcher } from '@/shared/layouts/WorkspaceSwitcher';

interface AppTopBarProps {
  onOpenMobileSidebar: () => void;
}

export function AppTopBar({ onOpenMobileSidebar }: AppTopBarProps) {
  const { user, logout } = useAuth();
  const { buildPath } = useWorkspace();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const getUserInitials = () => {
    if (!user.fullName) return '?';
    return user.fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden lg:block">
          <WorkspaceSwitcher variant="toolbar" />
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsProfileOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--main-blue)] text-sm font-medium text-white hover:bg-[var(--secondary-blue)]"
          aria-expanded={isProfileOpen}
          aria-label="Account menu"
        >
          {getUserInitials()}
        </button>

        {isProfileOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40"
              onClick={() => setIsProfileOpen(false)}
              aria-label="Close account menu"
            />
            <div className="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
              <div className="border-b border-gray-100 px-4 py-2">
                <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <Link
                href={buildPath('/profile')}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setIsProfileOpen(false)}
              >
                Profile settings
              </Link>
              <button
                type="button"
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 disabled:opacity-50"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? 'Logging out…' : 'Logout'}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
