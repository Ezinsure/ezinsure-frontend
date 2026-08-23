'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INSURANCE_CATEGORY_FILTER_OPTIONS } from '@/shared/insurance/categories';
import {
  isAcceptableOwnerPhoneInput,
  toApiRwandaPhone,
  toLocalRwandaPhone,
} from '@/features/livestock-application/utils/phone';
import type { CreateProspectPayload, Prospect } from '@/features/prospects/types';
import { formatIsoDateOnly } from '@/features/prospects/date-utils';

export interface ProspectFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: Prospect | null;
  isSubmitting?: boolean;
  /** Staff may optionally assign an agent id (email/id from parent). */
  showAgentAssignment?: boolean;
  agentOptions?: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (payload: CreateProspectPayload) => Promise<void> | void;
}

interface FormState {
  fullName: string;
  phoneNumber: string;
  insuranceExpiryDate: string;
  currentInsurer: string;
  insuranceCategory: string;
  notes: string;
  agentId: string;
}

function emptyForm(): FormState {
  return {
    fullName: '',
    phoneNumber: '',
    insuranceExpiryDate: '',
    currentInsurer: '',
    insuranceCategory: '',
    notes: '',
    agentId: '',
  };
}

function fromProspect(prospect: Prospect): FormState {
  return {
    fullName: prospect.fullName ?? '',
    phoneNumber: toLocalRwandaPhone(prospect.phoneNumber),
    insuranceExpiryDate: formatIsoDateOnly(prospect.insuranceExpiryDate),
    currentInsurer: prospect.currentInsurer ?? '',
    insuranceCategory: prospect.insuranceCategory ?? '',
    notes: prospect.notes ?? '',
    agentId: prospect.agentId ?? prospect.agent?._id ?? '',
  };
}

export function ProspectFormModal({
  open,
  mode,
  initial,
  isSubmitting,
  showAgentAssignment,
  agentOptions = [],
  onClose,
  onSubmit,
}: ProspectFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(initial ? fromProspect(initial) : emptyForm());
  }, [open, initial]);

  if (!open) return null;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.phoneNumber.trim()) {
      next.phoneNumber = 'Phone number is required';
    } else if (!isAcceptableOwnerPhoneInput(form.phoneNumber.trim())) {
      next.phoneNumber = 'Use a Rwanda mobile number (07XXXXXXXX)';
    }
    if (!form.insuranceExpiryDate) {
      next.insuranceExpiryDate = 'Insurance expiry date is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    const payload: CreateProspectPayload = {
      phoneNumber: toApiRwandaPhone(form.phoneNumber.trim()),
      insuranceExpiryDate: form.insuranceExpiryDate,
      fullName: form.fullName.trim() || undefined,
      currentInsurer: form.currentInsurer.trim() || undefined,
      insuranceCategory: form.insuranceCategory.trim() || undefined,
      notes: form.notes.trim() || undefined,
      agentId: showAgentAssignment && form.agentId ? form.agentId : undefined,
    };
    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prospect-form-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Prospects
            </p>
            <h2 id="prospect-form-title" className="mt-1 text-lg font-semibold text-slate-900">
              {mode === 'create' ? 'Add prospect' : 'Edit prospect'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Capture motorists insured elsewhere so you can follow up near expiry.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600 sm:col-span-2">
              Full name <span className="font-normal text-slate-400">(optional)</span>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
                placeholder="Client name"
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="text-xs font-medium text-slate-600 sm:col-span-2">
              Phone number <span className="text-red-500">*</span>
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => setField('phoneNumber', e.target.value)}
                placeholder="07XXXXXXXX"
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-xs text-red-600">{errors.phoneNumber}</p>
              )}
            </label>

            <label className="text-xs font-medium text-slate-600 sm:col-span-2">
              Insurance expiry date <span className="text-red-500">*</span>
              <input
                type="date"
                value={form.insuranceExpiryDate}
                onChange={(e) => setField('insuranceExpiryDate', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {errors.insuranceExpiryDate && (
                <p className="mt-1 text-xs text-red-600">{errors.insuranceExpiryDate}</p>
              )}
            </label>

            <label className="text-xs font-medium text-slate-600">
              Current insurer
              <input
                type="text"
                value={form.currentInsurer}
                onChange={(e) => setField('currentInsurer', e.target.value)}
                placeholder="Other provider"
                className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="text-xs font-medium text-slate-600">
              Category
              <select
                value={form.insuranceCategory}
                onChange={(e) => setField('insuranceCategory', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Not specified</option>
                {INSURANCE_CATEGORY_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {showAgentAssignment && (
              <label className="text-xs font-medium text-slate-600 sm:col-span-2">
                Assign to agent
                <select
                  value={form.agentId}
                  onChange={(e) => setField('agentId', e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Myself / unassigned</option>
                  {agentOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="text-xs font-medium text-slate-600 sm:col-span-2">
              Notes
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                placeholder="Follow-up context…"
                className="mt-1 block w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : mode === 'create' ? (
                'Add prospect'
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
