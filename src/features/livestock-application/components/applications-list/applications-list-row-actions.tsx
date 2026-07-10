'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, MoreHorizontal } from 'lucide-react';
import type { LivestockApplicationListItem } from '@/features/livestock-application/domain/application-types';

export interface ApplicationsListRowActionHandlers {
  onViewDetails: (app: LivestockApplicationListItem) => void;
}

interface ApplicationsListRowActionsProps {
  app: LivestockApplicationListItem;
  handlers: ApplicationsListRowActionHandlers;
}

const MENU_WIDTH = 176;
const MENU_GAP = 6;
const VIEWPORT_PADDING = 8;
const ESTIMATED_MENU_HEIGHT = 44;

function computeMenuPosition(
  button: HTMLButtonElement,
  menu?: HTMLDivElement | null,
): { top: number; left: number } {
  const rect = button.getBoundingClientRect();
  const menuHeight = menu?.offsetHeight ?? ESTIMATED_MENU_HEIGHT;

  let top = rect.bottom + MENU_GAP;
  if (top + menuHeight > window.innerHeight - VIEWPORT_PADDING) {
    top = rect.top - menuHeight - MENU_GAP;
  }

  let left = rect.right - MENU_WIDTH;
  left = Math.max(
    VIEWPORT_PADDING,
    Math.min(left, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING),
  );
  top = Math.max(VIEWPORT_PADDING, top);

  return { top, left };
}

export function ApplicationsListRowActions({ app, handlers }: ApplicationsListRowActionsProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuStyle(null);
      return;
    }

    const reposition = () => {
      if (!buttonRef.current) return;
      setMenuStyle(computeMenuPosition(buttonRef.current, menuRef.current));
    };

    reposition();
    const raf = requestAnimationFrame(reposition);

    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
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
    <>
      <div className="inline-flex justify-end" onClick={(event) => event.stopPropagation()}>
        <button
          ref={buttonRef}
          type="button"
          aria-label={`Actions for ${app.applicationNumber}`}
          aria-expanded={open}
          aria-haspopup="menu"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--main-blue)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setOpen((value) => !value)}
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {mounted &&
        open &&
        menuStyle &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: menuStyle.top,
              left: menuStyle.left,
              width: MENU_WIDTH,
            }}
            className="z-[200] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
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
          </div>,
          document.body,
        )}
    </>
  );
}
