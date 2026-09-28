'use client';

import type { ReactNode } from 'react';
import { CheckCircle2, Circle, CircleDot } from 'lucide-react';

export type WorkflowStepState = 'completed' | 'current' | 'upcoming' | 'skipped';

interface WorkflowStepCardProps {
  stepNumber: number;
  title: string;
  description: string;
  state: WorkflowStepState;
  children?: ReactNode;
  badge?: string;
}

function StepIcon({ state }: { state: WorkflowStepState }) {
  if (state === 'completed') {
    return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
  }
  if (state === 'current') {
    return <CircleDot className="h-5 w-5 text-blue-600" />;
  }
  if (state === 'skipped') {
    return <Circle className="h-5 w-5 text-slate-300" />;
  }
  return <Circle className="h-5 w-5 text-slate-300" />;
}

export function WorkflowStepCard({
  stepNumber,
  title,
  description,
  state,
  children,
  badge,
}: WorkflowStepCardProps) {
  const isMuted = state === 'upcoming' || state === 'skipped';

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 ${
        state === 'current'
          ? 'border-blue-200 bg-blue-50/40'
          : state === 'completed'
            ? 'border-emerald-100 bg-emerald-50/30'
            : 'border-slate-200 bg-slate-50/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <StepIcon state={state} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Step {stepNumber}
            </p>
            {badge && (
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                {badge}
              </span>
            )}
          </div>
          <h3 className={`mt-1 text-sm font-semibold ${isMuted ? 'text-slate-600' : 'text-slate-900'}`}>
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  );
}
