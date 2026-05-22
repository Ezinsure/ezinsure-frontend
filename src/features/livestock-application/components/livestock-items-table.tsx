'use client';

import { useRef, useState } from 'react';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LIVESTOCK_ANIMAL_CATEGORY_OPTIONS,
  LIVESTOCK_ANIMAL_TYPE_OPTIONS,
} from '@/features/livestock-application/constants';
import { LivestockSelect, LivestockTextField } from '@/features/livestock-application/components/form-controls';
import { LIVESTOCK_FORM_LABELS } from '@/features/livestock-application/labels';
import type { LivestockAnimalRow } from '@/features/livestock-application/types';
import {
  downloadLivestockBulkTemplate,
  parseLivestockBulkFile,
} from '@/features/livestock-application/utils/bulk-import';

interface LivestockItemsTableProps {
  items: LivestockAnimalRow[];
  errors: Record<string, string>;
  disabled?: boolean;
  onUpdate: (id: string, patch: Partial<LivestockAnimalRow>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMergeImported: (items: LivestockAnimalRow[]) => void;
  onImportMessage?: (message: string) => void;
}

export function LivestockItemsTable({
  items,
  errors,
  disabled,
  onUpdate,
  onAdd,
  onRemove,
  onMergeImported,
  onImportMessage,
}: LivestockItemsTableProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importNote, setImportNote] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setImportNote(null);
    try {
      const result = await parseLivestockBulkFile(file);
      if (result.items.length === 0) {
        setImportNote(
          result.errors.join(' ') ||
            'Nta mirongo yabonetse. Reba ko ufite header (chipNumber, animalType, …) n’imirongo yuzuye.',
        );
        return;
      }
      onMergeImported(result.items);
      const msg = `Byongewe ${result.items.length} amatungo kuri ibyo wari ufite.${
        result.errors.length ? ` ${result.errors.length} mirongo yasimbutse.` : ''
      }`;
      setImportNote(msg);
      onImportMessage?.(msg);
    } catch (err) {
      console.error('[LivestockImport]', err);
      setImportNote('Ntibyashobotse gusoma dosiye. Gerageza CSV (.csv) cyangwa Excel (.xlsx).');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Ongeraho buri tungo cyangwa ukuremo CSV/Excel — amatungo mashya azongerwa kuri ayariho.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={downloadLivestockBulkTemplate}
          >
            <Download className="h-4 w-4 mr-1" />
            {LIVESTOCK_FORM_LABELS.downloadTemplate}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1" />
            {LIVESTOCK_FORM_LABELS.uploadAnimals}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
          />
          <Button type="button" variant="primary" size="sm" disabled={disabled} onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            {LIVESTOCK_FORM_LABELS.addLivestock}
          </Button>
        </div>
      </div>

      {importNote && (
        <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          {importNote}
        </p>
      )}
      {errors.livestockItems && (
        <p className="text-xs text-red-600">{errors.livestockItems}</p>
      )}

      <div className="w-full max-w-full overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[92rem] w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left w-10">#</th>
              <th className="px-3 py-2 text-left min-w-[11rem]">{LIVESTOCK_FORM_LABELS.fields.animalType}</th>
              <th className="px-3 py-2 text-left min-w-[10rem]">{LIVESTOCK_FORM_LABELS.fields.animalCategory}</th>
              <th className="px-3 py-2 text-left min-w-[7rem]">{LIVESTOCK_FORM_LABELS.fields.animalAge}</th>
              <th className="px-3 py-2 text-left min-w-[13rem]">{LIVESTOCK_FORM_LABELS.fields.chipNumber}</th>
              <th className="px-3 py-2 text-left min-w-[10rem]">{LIVESTOCK_FORM_LABELS.fields.breed}</th>
              <th className="px-3 py-2 text-left min-w-[9rem]">{LIVESTOCK_FORM_LABELS.fields.color}</th>
              <th className="px-3 py-2 text-left min-w-[10rem]">{LIVESTOCK_FORM_LABELS.fields.productivity}</th>
              <th className="px-3 py-2 text-left min-w-[11rem]">{LIVESTOCK_FORM_LABELS.fields.sumAssured}</th>
              <th className="px-3 py-2 w-14" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <tr key={item.id} className="align-top bg-white">
                <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                <td className="px-2 py-2 min-w-[11rem]">
                  <LivestockSelect
                    fieldName="animalType"
                    value={item.animalType}
                    onChange={(v) => onUpdate(item.id, { animalType: v })}
                    options={LIVESTOCK_ANIMAL_TYPE_OPTIONS}
                    error={errors[`livestockItems.${index}.animalType`]}
                    disabled={disabled}
                    hideLabel
                  />
                </td>
                <td className="px-2 py-2 min-w-[10rem]">
                  <LivestockSelect
                    fieldName="animalCategory"
                    value={item.animalCategory}
                    onChange={(v) => onUpdate(item.id, { animalCategory: v })}
                    options={LIVESTOCK_ANIMAL_CATEGORY_OPTIONS}
                    disabled={disabled}
                    hideLabel
                  />
                </td>
                <td className="px-2 py-2 min-w-[7rem]">
                  <LivestockTextField
                    fieldName="animalAge"
                    type="number"
                    value={item.animalAge}
                    onChange={(v) => onUpdate(item.id, { animalAge: v })}
                    disabled={disabled}
                    hideLabel
                  />
                </td>
                <td className="px-2 py-2 min-w-[13rem]">
                  <LivestockTextField
                    fieldName="chipNumber"
                    value={item.chipNumber}
                    onChange={(v) => onUpdate(item.id, { chipNumber: v })}
                    error={errors[`livestockItems.${index}.chipNumber`]}
                    disabled={disabled}
                    hideLabel
                  />
                </td>
                <td className="px-2 py-2 min-w-[10rem]">
                  <LivestockTextField
                    fieldName="breed"
                    value={item.breed}
                    onChange={(v) => onUpdate(item.id, { breed: v })}
                    disabled={disabled}
                    hideLabel
                  />
                </td>
                <td className="px-2 py-2 min-w-[9rem]">
                  <LivestockTextField
                    fieldName="color"
                    value={item.color}
                    onChange={(v) => onUpdate(item.id, { color: v })}
                    disabled={disabled}
                    hideLabel
                  />
                </td>
                <td className="px-2 py-2 min-w-[10rem]">
                  <LivestockTextField
                    fieldName="productivity"
                    value={item.productivity}
                    onChange={(v) => onUpdate(item.id, { productivity: v })}
                    disabled={disabled}
                    hideLabel
                  />
                </td>
                <td className="px-2 py-2 min-w-[11rem]">
                  <LivestockTextField
                    fieldName="sumAssured"
                    type="number"
                    value={item.sumAssured}
                    onChange={(v) => onUpdate(item.id, { sumAssured: v })}
                    error={errors[`livestockItems.${index}.sumAssured`]}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
