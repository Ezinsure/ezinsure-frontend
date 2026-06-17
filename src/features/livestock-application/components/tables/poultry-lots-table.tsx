'use client';

import { useRef, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LivestockTextField } from '@/features/livestock-application/components/form-controls';
import { POULTRY_PRODUCT_OPTIONS } from '@/features/livestock-application/constants';
import type { LivestockAnimalRow } from '@/features/livestock-application/types';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { computePoultryLotAmounts } from '@/features/livestock-application/utils/poultry-calculations';

interface PoultryLotsTableProps {
  items: LivestockAnimalRow[];
  errors?: Record<string, string>;
  disabled?: boolean;
  onUpdate: (id: string, patch: Partial<LivestockAnimalRow>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export function PoultryLotsTable({
  items,
  disabled,
  onUpdate,
  onAdd,
  onRemove,
}: PoultryLotsTableProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importNote, setImportNote] = useState<string | null>(null);

  const handlePatch = (id: string, patch: Partial<LivestockAnimalRow>, row: LivestockAnimalRow) => {
    const merged = { ...row, ...patch, animalType: 'Inkoko' };
    const amounts = computePoultryLotAmounts(merged);
    onUpdate(id, {
      ...patch,
      animalType: 'Inkoko',
      sumAssured: amounts.sumAssured,
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
        Poultry premium: <strong>5.5%</strong> of lot value · Nkunganire <strong>40%</strong> · Farmer{' '}
        <strong>60%</strong> (payment proof amount per lot is the farmer share).
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Add lot
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setImportNote('Poultry bulk import template — placeholder until format is confirmed.');
            fileRef.current?.click();
          }}
        >
          <Upload className="mr-1 h-4 w-4" />
          Import lots
        </Button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" />
      </div>

      {importNote && (
        <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          {importNote}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[80rem] w-full text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 sm:text-xs">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left min-w-[8rem]">Lot No</th>
              <th className="px-3 py-2 text-left min-w-[10rem]">Product</th>
              <th className="px-3 py-2 text-left min-w-[12rem]">Hatchery source</th>
              <th className="px-3 py-2 text-left min-w-[7rem]">Quantity</th>
              <th className="px-3 py-2 text-left min-w-[9rem]">Unit value</th>
              <th className="px-3 py-2 text-left min-w-[10rem]">Total value</th>
              <th className="px-3 py-2 text-left min-w-[9rem]">Premium 5.5%</th>
              <th className="px-3 py-2 text-left min-w-[9rem]">Nkunganire 40%</th>
              <th className="px-3 py-2 text-left min-w-[9rem]">Farmer 60%</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => {
              const amounts = computePoultryLotAmounts(item);
              return (
                <tr key={item.id} className="align-top bg-white">
                  <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                  <td className="px-2 py-2">
                    <LivestockTextField
                      fieldName="lotNumber"
                      value={item.chipNumber || ''}
                      onChange={(v) => handlePatch(item.id, { chipNumber: v }, item)}
                      disabled={disabled}
                      hideLabel
                      placeholder="Lot No"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={item.poultryProductType || ''}
                      disabled={disabled}
                      onChange={(e) =>
                        handlePatch(
                          item.id,
                          { poultryProductType: e.target.value as LivestockAnimalRow['poultryProductType'] },
                          item,
                        )
                      }
                      className="w-full min-w-[10rem] rounded-lg border border-slate-200 px-2 py-2 text-sm"
                    >
                      <option value="">Hitamo…</option>
                      {POULTRY_PRODUCT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <LivestockTextField
                      fieldName="hatcherySource"
                      value={item.hatcherySource || ''}
                      onChange={(v) => handlePatch(item.id, { hatcherySource: v }, item)}
                      disabled={disabled}
                      hideLabel
                    />
                  </td>
                  <td className="px-2 py-2">
                    <LivestockTextField
                      fieldName="quantity"
                      type="number"
                      value={item.quantity || ''}
                      onChange={(v) => handlePatch(item.id, { quantity: v }, item)}
                      disabled={disabled}
                      hideLabel
                      placeholder="Quantity"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <LivestockTextField
                      fieldName="unitValue"
                      type="number"
                      value={item.unitValue || ''}
                      onChange={(v) => handlePatch(item.id, { unitValue: v }, item)}
                      disabled={disabled}
                      hideLabel
                    />
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-800">
                    {formatRwfDisplay(amounts.sumAssured)}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {formatRwfDisplay(amounts.premiumAmount)}
                  </td>
                  <td className="px-3 py-3 text-violet-700">
                    {formatRwfDisplay(amounts.nkunganireAmount)}
                  </td>
                  <td className="px-3 py-3 font-semibold text-emerald-700">
                    {formatRwfDisplay(amounts.farmerAmount)}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      disabled={disabled || items.length <= 1}
                      onClick={() => onRemove(item.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40"
                      aria-label="Remove lot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
