'use client';

import { useCallback, useMemo, useState } from 'react';

export interface TableSelection {
  selectedIds: ReadonlySet<string>;
  count: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Selects every id in `ids`, or clears them when all are already selected. */
  togglePage: (ids: readonly string[]) => void;
  clear: () => void;
}

/** Row selection that survives paging, keyed by row id. */
export function useTableSelection(): TableSelection {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const togglePage = useCallback((ids: readonly string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  return useMemo(
    () => ({
      selectedIds,
      count: selectedIds.size,
      isSelected: (id: string) => selectedIds.has(id),
      toggle,
      togglePage,
      clear,
    }),
    [selectedIds, toggle, togglePage, clear],
  );
}
