'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_PERIOD_PRESETS,
  PERIOD_PRESET_LABELS,
  detectPeriodPreset,
  isValidSpan,
  resolvePeriodPreset,
  type DateSpan,
  type PeriodPresetId,
} from '../period/presets';
import { cx } from './cx';

interface PeriodPickerProps {
  value: DateSpan;
  onChange: (span: DateSpan) => void;
  presets?: readonly PeriodPresetId[];
  label?: string;
  className?: string;
}

const chip = (active: boolean) =>
  cx(
    'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
    active
      ? 'bg-[var(--portal-primary)] text-white shadow-sm'
      : 'text-slate-600 hover:bg-slate-100',
  );

/** Quick presets plus a custom from/to range. Only emits valid, ordered ranges. */
export function PeriodPicker({
  value,
  onChange,
  presets = DEFAULT_PERIOD_PRESETS,
  label = 'Period',
  className,
}: PeriodPickerProps) {
  const activePreset = detectPeriodPreset(value, new Date(), presets);
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<DateSpan>>(value);

  useEffect(() => setDraft(value), [value]);

  const showCustom = customOpen || !activePreset;
  const invalid = Boolean(draft.from && draft.to && draft.from > draft.to);

  const updateDraft = (patch: Partial<DateSpan>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (isValidSpan(next)) onChange(next);
  };

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <div role="group" aria-label={label} className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {presets.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={activePreset === id && !customOpen}
            onClick={() => {
              setCustomOpen(false);
              onChange(resolvePeriodPreset(id));
            }}
            className={chip(activePreset === id && !customOpen)}
          >
            {PERIOD_PRESET_LABELS[id]}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={showCustom}
          onClick={() => setCustomOpen((open) => !open)}
          className={chip(showCustom)}
        >
          Custom
        </button>
      </div>

      {showCustom ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            From
            <input
              type="date"
              value={draft.from ?? ''}
              max={draft.to || undefined}
              onChange={(e) => updateDraft({ from: e.target.value })}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
            />
          </label>
          <label className="flex items-center gap-2">
            To
            <input
              type="date"
              value={draft.to ?? ''}
              min={draft.from || undefined}
              onChange={(e) => updateDraft({ to: e.target.value })}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
            />
          </label>
          {invalid ? (
            <p role="alert" className="text-xs text-rose-600">
              The start date must be on or before the end date.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
