'use client';

import { Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatRwf,
  type ExternalVetCommissionBatchSummary,
} from '../domain';
import { ExternalVetStatusBadge } from './status-badge';

type Props = {
  batches: ExternalVetCommissionBatchSummary[];
  isLoading?: boolean;
  emptyMessage?: string;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onView: (id: string) => void;
  rowActions?: (batch: ExternalVetCommissionBatchSummary) => React.ReactNode;
};

export function BatchListTable({
  batches,
  isLoading,
  emptyMessage = 'No commission batches found.',
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onView,
  rowActions,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!batches.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const allSelected =
    selectedIds &&
    batches.length > 0 &&
    batches.every((b) => selectedIds.has(b.id));

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {selectedIds && onToggleSelectAll ? (
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={!!allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Select all"
                />
              </th>
            ) : null}
            <th className="px-3 py-3 font-medium">Batch</th>
            <th className="px-3 py-3 font-medium">Vet</th>
            <th className="px-3 py-3 font-medium">Period</th>
            <th className="px-3 py-3 font-medium">Lines</th>
            <th className="px-3 py-3 font-medium">Company commission</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Created</th>
            <th className="px-3 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => (
            <tr key={batch.id} className="border-t border-slate-100 hover:bg-slate-50/80">
              {selectedIds && onToggleSelect ? (
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(batch.id)}
                    onChange={() => onToggleSelect(batch.id)}
                    aria-label={`Select ${batch.batchNumber}`}
                  />
                </td>
              ) : null}
              <td className="px-3 py-3 font-medium text-slate-900">
                {batch.batchNumber}
              </td>
              <td className="px-3 py-3">
                <div className="font-medium text-slate-800">
                  {batch.payee?.name ?? '—'}
                </div>
                <div className="text-xs text-slate-500">
                  {batch.payee?.phoneNumber ?? '—'}
                </div>
              </td>
              <td className="px-3 py-3 text-slate-600">
                {batch.periodLabel || '—'}
              </td>
              <td className="px-3 py-3">{batch.lineCount}</td>
              <td className="px-3 py-3 font-medium">
                {formatRwf(batch.totalCommission)}
              </td>
              <td className="px-3 py-3">
                <ExternalVetStatusBadge status={batch.status} />
              </td>
              <td className="px-3 py-3 text-slate-600">
                <div>{new Date(batch.createdAt).toLocaleDateString()}</div>
                <div className="text-xs">{batch.createdByName}</div>
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(batch.id)}
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    View
                  </Button>
                  {rowActions?.(batch)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
