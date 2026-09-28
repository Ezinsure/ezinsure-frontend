'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalScrollControlsProps {
  children: ReactNode;
  className?: string;
  /** Pixels to scroll per click (slow, deliberate). */
  stepPx?: number;
}

/**
 * Horizontal scroller with explicit left/right buttons so wide animal tables
 * are obviously scrollable (similar to a vertical scrollbar affordance).
 */
export function HorizontalScrollControls({
  children,
  className = '',
  stepPx = 220,
}: HorizontalScrollControlsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(max > 2 && el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scrollBy = (direction: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: direction * stepPx, behavior: 'smooth' });
  };

  return (
    <div className={`relative ${className}`}>
      {(canScrollLeft || canScrollRight) && (
        <div className="mb-2 flex items-center justify-end gap-2">
          <p className="mr-auto text-xs text-slate-500">Scroll left / right to see all columns</p>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            disabled={!canScrollLeft}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
      <div
        ref={scrollerRef}
        className="w-full max-w-full overflow-x-auto rounded-xl border border-slate-200"
      >
        {children}
      </div>
    </div>
  );
}
