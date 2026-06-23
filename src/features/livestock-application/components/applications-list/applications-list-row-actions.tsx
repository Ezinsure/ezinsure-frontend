'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, MoreHorizontal } from 'lucide-react';
import type { LivestockApplicationListItem } from '@/features/livestock-application/domain/application-types';

export interface ApplicationsListRowActionHandlers {
  onViewDetails: (app: LivestockApplicationListItem) => void;
}

interface ApplicationsListRowActionsProps {
  app: LivestockApplicationListItem;
  handlers: ApplicationsListRowActionHandlers;
}

export function ApplicationsListRowActions({ app, handlers }: ApplicationsListRowActionsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative inline-flex justify-end"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label={`Actions for ${app.applicationNumber}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--main-blue)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
            onClick={() => {
              setOpen(false);
              handlers.onViewDetails(app);
            }}
          >
            <Eye className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
            View details
          </button>
        </div>
      )}
    </div>
  );
}
