type BatchScopedLine = { id: string; batchId: string };

export type WholeBatchScope<T extends BatchScopedLine> = {
  /** Every line of every batch touched by the selection. */
  lines: T[];
  batchIds: string[];
  /** Lines pulled in only because their batch was partly selected. */
  addedCount: number;
};

/**
 * Reclaim / reimbursement endpoints work on whole batches (`batchIds`), while
 * the Lines table lets users tick individual lines. Expanding the selection
 * up-front makes the confirm dialog, totals and export match what the server
 * will actually change.
 */
export function expandToWholeBatches<T extends BatchScopedLine>(
  selected: readonly T[],
  allLines: readonly T[],
): WholeBatchScope<T> {
  if (!selected.length) return { lines: [], batchIds: [], addedCount: 0 };

  const selectedIds = new Set(selected.map((line) => line.id));
  const batchIds = new Set(selected.map((line) => line.batchId));
  const lines = allLines.filter((line) => batchIds.has(line.batchId));
  const addedCount = lines.reduce(
    (count, line) => (selectedIds.has(line.id) ? count : count + 1),
    0,
  );

  return { lines, batchIds: [...batchIds], addedCount };
}
