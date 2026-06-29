'use client';

import { LivestockSelect, LivestockTextField } from '@/features/livestock-application/components/form-controls';
import { OWNER_GENDER_OPTIONS } from '@/features/livestock-application/constants';
import { LIVESTOCK_FORM_LABELS } from '@/features/livestock-application/labels';
import type { LivestockAnimalRow } from '@/features/livestock-application/types';

interface OwnerTableHeadersProps {
  showOwnerColumns?: boolean;
}

export function OwnerTableHeaders({ showOwnerColumns }: OwnerTableHeadersProps) {
  const labels = LIVESTOCK_FORM_LABELS.fields;
  return (
    <>
      {showOwnerColumns && (
        <>
          <th className="px-3 py-2 text-left min-w-[11rem]">{labels.ownerName}</th>
          <th className="px-3 py-2 text-left min-w-[10rem]">{labels.ownerPhone}</th>
          <th className="px-3 py-2 text-left min-w-[11rem]">{labels.ownerNationalId}</th>
          <th className="px-3 py-2 text-left min-w-[9rem]">{labels.ownerGender}</th>
        </>
      )}
    </>
  );
}

interface OwnerTableCellsProps {
  item: LivestockAnimalRow;
  index: number;
  errors: Record<string, string>;
  disabled?: boolean;
  showOwnerColumns?: boolean;
  onUpdate: (patch: Partial<LivestockAnimalRow>) => void;
}

export function OwnerTableCells({
  item,
  index,
  errors,
  disabled,
  showOwnerColumns,
  onUpdate,
}: OwnerTableCellsProps) {
  const prefix = `livestockItems.${index}`;

  return (
    <>
      {showOwnerColumns && (
        <>
          <td className="px-2 py-2">
            <LivestockTextField
              fieldName="ownerName"
              value={item.ownerName || ''}
              onChange={(v) => onUpdate({ ownerName: v })}
              error={errors[`${prefix}.ownerName`]}
              disabled={disabled}
              hideLabel
            />
          </td>
          <td className="px-2 py-2">
            <LivestockTextField
              fieldName="ownerPhone"
              value={item.ownerPhone || ''}
              onChange={(v) => onUpdate({ ownerPhone: v })}
              error={errors[`${prefix}.ownerPhone`]}
              disabled={disabled}
              hideLabel
            />
          </td>
          <td className="px-2 py-2">
            <LivestockTextField
              fieldName="ownerNationalId"
              value={item.ownerNationalId || ''}
              onChange={(v) => onUpdate({ ownerNationalId: v })}
              error={errors[`${prefix}.ownerNationalId`]}
              disabled={disabled}
              hideLabel
            />
          </td>
          <td className="px-2 py-2 min-w-[9rem]">
            <LivestockSelect
              fieldName="ownerGender"
              value={item.ownerGender || ''}
              onChange={(v) => onUpdate({ ownerGender: v as LivestockAnimalRow['ownerGender'] })}
              options={OWNER_GENDER_OPTIONS}
              error={errors[`${prefix}.ownerGender`]}
              disabled={disabled}
              hideLabel
            />
          </td>
        </>
      )}
    </>
  );
}
