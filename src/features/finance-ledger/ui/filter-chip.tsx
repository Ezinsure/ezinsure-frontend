'use client';

import { cx } from './cx';

interface FilterChipProps {
  label: string;
  pressed: boolean;
  onClick: () => void;
  /** Soften the chip when many are shown in a row. */
  size?: 'sm' | 'md';
  title?: string;
  className?: string;
}

/** Toggle chip for multi-select filters (stages, sources, …). */
export function FilterChip({ label, pressed, onClick, size = 'md', title, className }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={title}
      onClick={onClick}
      className={cx(
        'cursor-pointer rounded-md font-medium transition-colors',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        pressed
          ? 'bg-[var(--portal-primary)] text-white shadow-sm'
          : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50',
        className,
      )}
    >
      {label}
    </button>
  );
}
