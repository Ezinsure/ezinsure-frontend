'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InsuredLinePayload } from '@/features/livestock-application/domain/application-types';
import { buildLineDetailFields } from '@/features/livestock-application/utils/insured-line-display';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';

interface InsuredLineDetailModalProps {
  open: boolean;
  line: InsuredLinePayload | null;
  lineIndex: number;
  onClose: () => void;
}

export function InsuredLineDetailModal({
  open,
  line,
  lineIndex,
  onClose,
}: InsuredLineDetailModalProps) {
  if (!open || !line) return null;

  const fields = buildLineDetailFields(line);
  const title =
    line.lineType === 'LOT'
      ? `Lot ${lineIndex + 1} · ${line.quantity} birds`
      : `Animal ${lineIndex + 1} · ${line.animal.chipNumber || 'No chip / eartag'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-labelledby="line-detail-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Insured line</p>
            <h3 id="line-detail-title" className="mt-1 text-lg font-semibold text-slate-900">
              {title}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {line.animal.species}
              {line.owner?.name ? ` · ${line.owner.name}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="mb-6 grid grid-cols-3 gap-3">
            {[
              ['Sum assured', formatRwfDisplay(line.sumAssured)],
              ['Premium', formatRwfDisplay(line.premiumRate)],
              ['Farmer 60%', formatRwfDisplay(line.farmerContribution)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-semibold uppercase text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map(({ label, value }) => (
              <div key={label} className="border-b border-slate-50 pb-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
