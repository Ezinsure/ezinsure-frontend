'use client';

import { useRef, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LivestockTextField } from '@/features/livestock-application/components/form-controls';
import { OwnerTableCells, OwnerTableHeaders } from '@/features/livestock-application/components/tables/livestock-owner-table-columns';
import { POULTRY_PRODUCT_OPTIONS } from '@/features/livestock-application/constants';
import { LIVESTOCK_FORM_LABELS } from '@/features/livestock-application/labels';
import type { LivestockAnimalRow } from '@/features/livestock-application/types';
import { HorizontalScrollControls } from '@/features/livestock-application/components/shared/horizontal-scroll-controls';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import { computePoultryLotAmounts } from '@/features/livestock-application/utils/poultry-calculations';

interface PoultryLotsTableProps {
  items: LivestockAnimalRow[];
  errors?: Record<string, string>;
  disabled?: boolean;
  showOwnerColumns?: boolean;
  onUpdate: (id: string, patch: Partial<LivestockAnimalRow>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export function PoultryLotsTable({
  items,
  errors = {},
  disabled,
  showOwnerColumns = false,
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
        {showOwnerColumns && (
          <>
            {' '}
            Andika amazina n&apos;telefone y&apos;umuhinzi kuri buri lot.
          </>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" />
          {LIVESTOCK_FORM_LABELS.addLivestock}
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
          {LIVESTOCK_FORM_LABELS.uploadAnimals}
        </Button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" />
      </div>

      {importNote && (
        <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          {importNote}
        </p>
      )}
      {errors.livestockItems && (
        <p className="text-xs text-red-600">{errors.livestockItems}</p>
      )}

      <HorizontalScrollControls>
        <table
          className={`w-full text-sm ${
            showOwnerColumns ? 'min-w-[120rem]' : 'min-w-[88rem]'
          }`}
        >
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left w-10">#</th>
              <OwnerTableHeaders showOwnerColumns={showOwnerColumns} />
              <th className="px-3 py-2 text-left min-w-[8rem]">{LIVESTOCK_FORM_LABELS.fields.lotNumber}</th>
              <th className="px-3 py-2 text-left min-w-[10rem]">Product</th>
              <th className="px-3 py-2 text-left min-w-[12rem]">
                {LIVESTOCK_FORM_LABELS.fields.hatcherySource}
              </th>
              <th className="px-3 py-2 text-left min-w-[7rem]">{LIVESTOCK_FORM_LABELS.fields.quantity}</th>
              <th className="px-3 py-2 text-left min-w-[9rem]">{LIVESTOCK_FORM_LABELS.fields.unitValue}</th>
              <th className="px-3 py-2 text-left min-w-[10rem]">Total value</th>
              <th className="px-3 py-2 text-left min-w-[9rem]">Premium 5.5%</th>
              <th className="px-3 py-2 text-left min-w-[9rem]">Nkunganire 40%</th>
              <th className="px-3 py-2 text-left min-w-[9rem]">Farmer 60%</th>
              <th className="px-3 py-2 text-left min-w-[14rem]">
                {LIVESTOCK_FORM_LABELS.fields.vaccinationInfo}
              </th>
              <th className="px-3 py-2 w-14" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => {
              const amounts = computePoultryLotAmounts(item);
              return (
                <tr key={item.id} className="align-top bg-white">
                  <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                  <OwnerTableCells
                    item={item}
                    index={index}
                    errors={errors}
                    disabled={disabled}
                    showOwnerColumns={showOwnerColumns}
                    onUpdate={(patch) => handlePatch(item.id, patch, item)}
                  />
                  <td className="px-2 py-2">
                    <LivestockTextField
                      fieldName="lotNumber"
                      value={item.chipNumber || ''}
                      onChange={(v) => handlePatch(item.id, { chipNumber: v }, item)}
                      error={errors[`livestockItems.${index}.chipNumber`]}
                      disabled={disabled}
                      hideLabel
                      placeholder={LIVESTOCK_FORM_LABELS.placeholders.lotNumber}
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
                      aria-invalid={Boolean(errors[`livestockItems.${index}.poultryProductType`])}
                      className={`w-full min-w-[10rem] rounded-lg border px-2 py-2 text-sm ${
                        errors[`livestockItems.${index}.poultryProductType`]
                          ? 'border-red-300 ring-1 ring-red-100'
                          : 'border-slate-200'
                      }`}
                    >
                      <option value="">Hitamo…</option>
                      {POULTRY_PRODUCT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {errors[`livestockItems.${index}.poultryProductType`] && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors[`livestockItems.${index}.poultryProductType`]}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <LivestockTextField
                      fieldName="hatcherySource"
                      value={item.hatcherySource || ''}
                      onChange={(v) => handlePatch(item.id, { hatcherySource: v }, item)}
                      error={errors[`livestockItems.${index}.hatcherySource`]}
                      disabled={disabled}
                      hideLabel
                      placeholder={LIVESTOCK_FORM_LABELS.placeholders.hatcherySource}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <LivestockTextField
                      fieldName="quantity"
                      type="number"
                      value={item.quantity || ''}
                      onChange={(v) => handlePatch(item.id, { quantity: v }, item)}
                      error={errors[`livestockItems.${index}.quantity`]}
                      disabled={disabled}
                      hideLabel
                    />
                  </td>
                  <td className="px-2 py-2">
                    <LivestockTextField
                      fieldName="unitValue"
                      type="number"
                      value={item.unitValue || ''}
                      onChange={(v) => handlePatch(item.id, { unitValue: v }, item)}
                      error={errors[`livestockItems.${index}.unitValue`]}
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
                  <td className="px-2 py-2 min-w-[14rem]">
                    <LivestockTextField
                      fieldName="vaccinationInfo"
                      value={item.vaccinationInfo || ''}
                      onChange={(v) => handlePatch(item.id, { vaccinationInfo: v }, item)}
                      disabled={disabled}
                      hideLabel
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      disabled={disabled || items.length <= 1}
                      onClick={() => onRemove(item.id)}
                      title={LIVESTOCK_FORM_LABELS.removeLivestock}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-100 hover:text-red-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
                      aria-label={LIVESTOCK_FORM_LABELS.removeLivestock}
                    >
                      <Trash2 className="h-5 w-5" strokeWidth={2.25} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </HorizontalScrollControls>
    </div>
  );
}
