'use client';

import { useMemo } from 'react';
import {
  getAllDistrictOptions,
  getSectorNamesForDistrict,
} from '@/features/livestock-application/utils/location';
import { rwandaBanks } from '@/utils/rwanda-banks';
import type { ExternalVetPayeeSnapshot } from '../domain';

type Props = {
  payee: ExternalVetPayeeSnapshot;
  onChange: (next: ExternalVetPayeeSnapshot) => void;
  periodLabel: string;
  onPeriodLabelChange: (value: string) => void;
};

export function VetPayeeFields({
  payee,
  onChange,
  periodLabel,
  onPeriodLabelChange,
}: Props) {
  const districts = useMemo(() => getAllDistrictOptions(), []);
  const sectors = useMemo(
    () =>
      payee.district
        ? getSectorNamesForDistrict(payee.district).map((name) => ({
            value: name,
            label: name,
          }))
        : [],
    [payee.district],
  );

  function patch(partial: Partial<ExternalVetPayeeSnapshot>) {
    onChange({ ...payee, ...partial });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="mb-1 text-sm font-semibold text-slate-800">
          Veterinary agent identification
        </p>
        <p className="mb-3 text-xs text-slate-500">
          Matches section 1 of the claim form. Bank details are optional when a
          phone / MoMo number is provided.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600">
              Full name <span className="text-rose-500">*</span>
            </label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={payee.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Veterinary agent full name"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              District <span className="text-rose-500">*</span>
            </label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={payee.district}
              onChange={(e) =>
                patch({ district: e.target.value, sector: '' })
              }
            >
              <option value="">Select district</option>
              {districts.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Sector <span className="text-rose-500">*</span>
            </label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={payee.sector}
              onChange={(e) => patch({ sector: e.target.value })}
              disabled={!payee.district}
            >
              <option value="">
                {payee.district ? 'Select sector' : 'Select district first'}
              </option>
              {sectors.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Phone / Mobile Money <span className="text-rose-500">*</span>
            </label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={payee.phoneNumber}
              onChange={(e) => patch({ phoneNumber: e.target.value })}
              placeholder="e.g. 078xxxxxxx"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Date of commission request{' '}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={payee.commissionRequestDate}
              onChange={(e) => patch({ commissionRequestDate: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Bank{' '}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={payee.bankName ?? ''}
              onChange={(e) => patch({ bankName: e.target.value })}
            >
              <option value="">Select Bank</option>
              {rwandaBanks.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">
              Bank account number{' '}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={payee.bankAccountNumber ?? ''}
              onChange={(e) => patch({ bankAccountNumber: e.target.value })}
              placeholder="Bank account number"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-slate-600">
              Period label <span className="text-rose-500">*</span>
            </label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              placeholder="e.g. September 2026"
              value={periodLabel}
              onChange={(e) => onPeriodLabelChange(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Used on exports and reclaim files — do not leave this as the file
              name.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function emptyPayeeSnapshot(): ExternalVetPayeeSnapshot {
  return {
    name: '',
    phoneNumber: '',
    district: '',
    sector: '',
    commissionRequestDate: new Date().toISOString().slice(0, 10),
    bankName: '',
    bankAccountNumber: '',
  };
}

export function payeeFormComplete(
  payee: ExternalVetPayeeSnapshot,
  periodLabel: string,
): boolean {
  return (
    !!payee.name.trim() &&
    !!payee.phoneNumber.trim() &&
    !!payee.district.trim() &&
    !!payee.sector.trim() &&
    !!payee.commissionRequestDate.trim() &&
    !!periodLabel.trim()
  );
}
