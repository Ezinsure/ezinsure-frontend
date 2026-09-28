'use client';

import { Check } from 'lucide-react';
import { LIVESTOCK_FORM_LABELS } from '@/features/livestock-application/labels';
import type { LivestockApplicationStepId } from '@/features/livestock-application/types';

interface ApplicationStepProgressProps {
  stepIds: LivestockApplicationStepId[];
  stepIndex: number;
  onStepClick?: (index: number) => void;
  disabled?: boolean;
}

export function ApplicationStepProgress({
  stepIds,
  stepIndex,
  onStepClick,
  disabled,
}: ApplicationStepProgressProps) {
  return (
    <nav aria-label="Progress" className="mb-6">
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          Step {stepIndex + 1} of {stepIds.length}
        </span>
        <span className="hidden sm:inline">
          {LIVESTOCK_FORM_LABELS.sections[stepIds[stepIndex]]}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${((stepIndex + 1) / stepIds.length) * 100}%` }}
        />
      </div>
      <ol className="mt-4 flex gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:gap-2">
        {stepIds.map((stepId, index) => {
          const done = index < stepIndex;
          const active = index === stepIndex;
          return (
            <li key={stepId}>
              <button
                type="button"
                disabled={disabled && !active}
                onClick={() => {
                  if (index <= stepIndex && onStepClick) onStepClick(index);
                }}
                className={[
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition sm:px-3 sm:text-xs',
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : done
                      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                      : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] sm:h-5 sm:w-5 sm:text-[10px]',
                    active ? 'bg-white/25' : 'bg-slate-100',
                  ].join(' ')}
                >
                  {done ? <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : index + 1}
                </span>
                <span className="max-w-[5rem] truncate sm:max-w-[7rem]">
                  {LIVESTOCK_FORM_LABELS.sections[stepId]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
