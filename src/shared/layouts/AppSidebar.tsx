'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { getNavigation } from '@/shared/navigation';
import { WorkspaceSwitcher } from '@/shared/layouts/WorkspaceSwitcher';

interface AppSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapse,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { activeProductLine, canSwitchWorkspace, allowedProductLines } = useWorkspace();

  if (!user) return null;

  const groups = getNavigation(user.role, activeProductLine);
  const showWorkspaceInSidebar = !collapsed && (canSwitchWorkspace || allowedProductLines.length === 1);

  const cleanPath = pathname.split('?')[0];
  const navHrefs = groups.flatMap((group) => group.items.map((item) => item.href));
  const activeHref =
    navHrefs
      .filter((href) => cleanPath === href || cleanPath.startsWith(`${href}/`))
      .sort((a, b) => b.length - a.length)[0] ?? null;

  const isActive = (href: string) => activeHref === href;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onMobileClose}
          aria-label="Close sidebar overlay"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh flex-col border-r border-gray-200 bg-white transition-all duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-dvh ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-[72px]' : 'w-64 sm:w-72'}`}
      >
        {/* Fixed header: logo + collapse */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-3">
          {!collapsed && (
            <Link
              href="/"
              className="min-w-0 truncate text-lg font-bold text-[var(--main-blue)]"
            >
              EZ<span className="text-[var(--accent-orange)]">INSURE</span>
            </Link>
          )}
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden rounded-md p-1.5 text-gray-500 hover:bg-gray-100 lg:inline-flex"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onMobileClose}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Workspace switcher in sidebar on small screens; also when sidebar expanded on tablet */}
        {showWorkspaceInSidebar && (
          <div className="shrink-0 border-b border-gray-200 px-3 py-3 lg:hidden">
            <WorkspaceSwitcher variant="sidebar" />
          </div>
        )}

        {/* Scrollable navigation */}
        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {groups.map((group, groupIndex) => (
            <div
              key={group.label ?? `group-${groupIndex}`}
              className={groupIndex > 0 ? 'mt-6' : ''}
            >
              {group.label && !collapsed && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {group.label}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onMobileClose}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          active
                            ? 'bg-[var(--main-blue)] text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {Icon && <Icon className="h-5 w-5 shrink-0" />}
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
