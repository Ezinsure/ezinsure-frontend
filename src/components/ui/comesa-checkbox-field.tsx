'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  calculateAdministrationFeesRwf,
  isMotorVehicleInsuranceCategory,
} from '@/utils/administration-fees';

export type ComesaCheckboxFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  insuranceCategory?: string;
  id?: string;
  className?: string;
  label?: string;
  error?: string;
  /** Compact layout for edit modals */
  variant?: 'default' | 'compact';
};

export function ComesaCheckboxField({
  checked,
  onChange,
  insuranceCategory = '',
  id = 'isCOMESA',
  className = '',
  label = 'Ext. Territorial (COMESA)',
  error,
  variant = 'default',
}: ComesaCheckboxFieldProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const isVehicle = isMotorVehicleInsuranceCategory(insuranceCategory);
  const standardFee = isVehicle
    ? calculateAdministrationFeesRwf(insuranceCategory, false)
    : null;
  const comesaFee = isVehicle ? calculateAdministrationFeesRwf(insuranceCategory, true) : null;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setShowConfirm(true);
      return;
    }
    onChange(false);
  };

  const handleConfirm = () => {
    onChange(true);
    setShowConfirm(false);
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  const labelClass = variant === 'compact' ? 'text-sm text-gray-700' : 'text-sm font-medium';

  return (
    <>
      <div className={className}>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            id={id}
            name="isCOMESA"
            checked={checked}
            onChange={handleCheckboxChange}
            className="rounded h-4 border-gray-300 text-[var(--main-blue)] focus:ring-[var(--main-blue)]"
          />
          <span className={labelClass}>{label}</span>
        </label>

        <div className="mt-2 flex gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <Info className="h-4 w-4 shrink-0 text-[var(--main-blue)] mt-0.5" aria-hidden />
          <p className="text-xs text-gray-700 leading-relaxed">
            COMESA (Ext. Territorial) extends motor insurance cover to other COMESA member countries,
            not only Rwanda. If you select this option, administration fees and the overall insurance
            price are higher than standard Rwanda-only cover.
            {isVehicle && standardFee != null && comesaFee != null ? (
              <>
                {' '}
                Example administration fees:{' '}
                <span className="font-medium">{standardFee.toLocaleString()} RWF</span> (standard) vs{' '}
                <span className="font-medium">{comesaFee.toLocaleString()} RWF</span> (COMESA).
              </>
            ) : null}
          </p>
        </div>

        {error ? <p className="mt-1 text-sm text-[var(--error-red)]">{error}</p> : null}
      </div>

      {showConfirm && (
        <div
          className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-[100] p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="comesa-confirm-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 fade-in">
            <h3 id="comesa-confirm-title" className="text-lg font-semibold text-gray-900 mb-2">
              Enable COMESA coverage?
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              You are about to add <strong>Ext. Territorial (COMESA)</strong> coverage to this
              application.
            </p>
            <ul className="text-sm text-gray-600 space-y-2 mb-4 list-disc pl-5">
              <li>Cover applies in Rwanda and other COMESA countries during travel.</li>
              <li>Administration fees and the total insurance amount will be higher than without COMESA.</li>
              <li>Confirm only if the client understands and agrees to the higher cost.</li>
            </ul>
            {isVehicle && standardFee != null && comesaFee != null ? (
              <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                Administration fee increases from{' '}
                <strong>{standardFee.toLocaleString()} RWF</strong> to{' '}
                <strong>{comesaFee.toLocaleString()} RWF</strong> for this vehicle category.
              </p>
            ) : null}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="text" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="button" onClick={handleConfirm}>
                Yes, enable COMESA
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
