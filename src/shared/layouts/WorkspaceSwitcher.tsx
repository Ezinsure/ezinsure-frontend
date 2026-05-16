'use client';

import { Car, PawPrint } from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import type { ProductLine } from '@/shared/types/product-line';

const OPTIONS: { line: ProductLine; label: string; icon: typeof Car }[] = [
  { line: 'motor', label: 'Motor', icon: Car },
  { line: 'livestock', label: 'Livestock', icon: PawPrint },
];

type WorkspaceSwitcherVariant = 'toolbar' | 'sidebar';

interface WorkspaceSwitcherProps {
  variant?: WorkspaceSwitcherVariant;
}

export function WorkspaceSwitcher({ variant = 'toolbar' }: WorkspaceSwitcherProps) {
  const { activeProductLine, allowedProductLines, canSwitchWorkspace, setProductLine } =
    useWorkspace();

  const isSidebar = variant === 'sidebar';

  if (!canSwitchWorkspace) {
    const single = OPTIONS.find((o) => allowedProductLines.includes(o.line));
    if (!single) return null;

    const Icon = single.icon;
    return (
      <div
        className={`flex items-center gap-2 rounded-lg bg-[var(--light-gray)] text-sm font-medium text-gray-700 ${
          isSidebar ? 'w-full px-3 py-2.5' : 'px-3 py-1.5'
        }`}
      >
        <Icon className="h-4 w-4 shrink-0 text-[var(--main-blue)]" />
        <span className="truncate">{single.label} Insurance</span>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Insurance workspace"
      className={`flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm ${
        isSidebar ? 'w-full flex-col gap-1 sm:flex-row' : ''
      }`}
    >
      {OPTIONS.filter((o) => allowedProductLines.includes(o.line)).map((option) => {
        const Icon = option.icon;
        const isActive = activeProductLine === option.line;

        return (
          <button
            key={option.line}
            type="button"
            onClick={() => setProductLine(option.line)}
            className={`flex flex-1 items-center cursor-pointer justify-center gap-1.5 rounded-md text-sm font-medium transition-colors ${
              isSidebar ? 'px-3 py-2.5' : 'px-3 py-1.5'
            } ${
              isActive
                ? 'bg-[var(--main-blue)] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
