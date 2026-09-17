'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

const DEFAULT_CHUNK = 40;
const DEFAULT_THRESHOLD = 50;

/**
 * Chunked windowing for large lists (commission line tables).
 * Avoids rendering hundreds of DOM rows until the user asks for more.
 */
export function useWindowedList<T>(
  items: T[],
  options?: { chunkSize?: number; threshold?: number },
) {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK;
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD;
  const [visible, setVisible] = useState(chunkSize);

  useEffect(() => {
    setVisible(chunkSize);
  }, [items.length, chunkSize]);

  const needsWindow = items.length > threshold;
  const slice = useMemo(() => {
    if (!needsWindow) return items;
    return items.slice(0, Math.min(visible, items.length));
  }, [items, needsWindow, visible]);

  const remaining = items.length - slice.length;

  return {
    slice,
    remaining,
    needsWindow,
    total: items.length,
    visibleCount: slice.length,
    showMore: () => setVisible((v) => v + chunkSize),
    showAll: () => setVisible(items.length),
  };
}

type FooterProps = {
  total: number;
  visibleCount: number;
  remaining: number;
  needsWindow: boolean;
  onShowMore: () => void;
  onShowAll?: () => void;
  chunkHint?: number;
};

export function WindowedListFooter({
  total,
  visibleCount,
  remaining,
  needsWindow,
  onShowMore,
  onShowAll,
  chunkHint = DEFAULT_CHUNK,
}: FooterProps) {
  if (!needsWindow) return null;

  if (remaining <= 0) {
    return (
      <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
        Showing all {total} lines
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-3 py-2">
      <p className="text-xs text-slate-500">
        Showing {visibleCount} of {total} lines
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onShowMore}>
          Show {Math.min(chunkHint, remaining)} more
        </Button>
        {onShowAll ? (
          <Button type="button" variant="text" size="sm" onClick={onShowAll}>
            Show all
          </Button>
        ) : null}
      </div>
    </div>
  );
}
