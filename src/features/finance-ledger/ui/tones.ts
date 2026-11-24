import type { StageTone } from '../domain';

/** Every tone is spelled out in full so Tailwind can see the class names. */
export const CHIP_TONE_CLASSES: Record<StageTone, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  sky: 'bg-sky-50 text-sky-800 ring-sky-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200',
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  orange: 'bg-orange-50 text-orange-800 ring-orange-200',
  teal: 'bg-teal-50 text-teal-800 ring-teal-200',
  rose: 'bg-rose-50 text-rose-800 ring-rose-200',
};

export const CHIP_DOT_CLASSES: Record<StageTone, string> = {
  slate: 'bg-slate-400',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  orange: 'bg-orange-500',
  teal: 'bg-teal-500',
  rose: 'bg-rose-500',
};
