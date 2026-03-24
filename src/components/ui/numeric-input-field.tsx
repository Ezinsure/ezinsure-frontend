'use client';

import React, { useCallback, useId, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { filterIntegerDigits } from '@/utils/numeric-input';

type NumericFieldSize = 'default' | 'compact' | 'form';

/** Inline range hint: no clamping while typing; blur or “full length” (maxDigits) surfaces errors. */
function computeNumericRangeError(
  value: string,
  min: number | undefined,
  max: number | undefined,
  maxDigits: number | undefined,
  focused: boolean,
): string | null {
  if (min == null && max == null) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n)) return null;
  const below = min != null && n < min;
  const above = max != null && n > max;
  if (!below && !above) return null;

  const msg =
    min != null && max != null
      ? `Must be between ${min.toLocaleString()} and ${max.toLocaleString()}`
      : min != null
        ? `Must be at least ${min.toLocaleString()}`
        : `Must be at most ${max!.toLocaleString()}`;

  if (maxDigits != null) {
    if (trimmed.length === maxDigits) return msg;
    if (!focused) return msg;
    return null;
  }
  if (!focused) return msg;
  return null;
}

export interface NumericInputFieldProps {
  /** Visible label (unless hideLabel) */
  label: string;
  /** Controlled string value: digits only, or empty */
  value: string;
  onChange: (value: string) => void;
  /** input name + id fallback */
  name: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  /** Shown below the field when no error */
  helperText?: string;
  placeholder?: string;
  /** Hard cap on digit count (e.g. 3 for day counts up to 366) */
  maxDigits?: number;
  /** Inclusive min/max for inline range messages (no auto-clamp while typing). */
  min?: number;
  max?: number;
  /** `invoice` = send-invoice modal (green). `adminEdit` = admin grid inputs (gray + main blue). */
  accent?: 'default' | 'invoice' | 'adminEdit';
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  /** `form` = match apply-form selects / combobox: single border, fixed control height. */
  size?: NumericFieldSize;
  hideLabel?: boolean;
  autoComplete?: string;
  /** aria-label when label hidden */
  'aria-label'?: string;
}

const sizeStyles: Record<
  NumericFieldSize,
  { wrapper: string; label: string; border: string; input: string }
> = {
  default: {
    wrapper: 'mb-4',
    label: 'block text-sm font-medium text-gray-700 mb-2',
    border: 'rounded-lg border-2',
    input: 'w-full py-3 px-3 rounded-lg text-base tabular-nums',
  },
  compact: {
    wrapper: 'mb-2',
    label: 'block text-xs font-semibold text-gray-600 tracking-wide mb-1',
    border: 'rounded-md border',
    input: 'w-full py-2 px-2.5 rounded-md text-sm tabular-nums',
  },
  form: {
    wrapper: 'mb-0',
    label: 'block text-sm font-medium text-gray-700 mb-1',
    border: 'rounded-lg border border-gray-300',
    /** Shell uses min-h + flex; input is borderless so total height matches ComboboxField (42px). */
    input:
      'w-full flex-1 min-w-0 min-h-0 border-0 bg-transparent px-3 text-sm tabular-nums shadow-none focus:ring-0 h-9 py-0 rounded-lg',
  },
};

export function NumericInputField({
  label,
  value,
  onChange,
  name,
  id,
  required = false,
  disabled = false,
  error,
  helperText,
  placeholder = '0',
  maxDigits,
  min,
  max,
  accent = 'default',
  className = '',
  inputClassName = '',
  labelClassName = '',
  size = 'default',
  hideLabel = false,
  autoComplete = 'off',
  'aria-label': ariaLabel,
}: NumericInputFieldProps) {
  const reactId = useId();
  const fieldId = id ?? `${name}-${reactId}`;
  const [focused, setFocused] = useState(false);
  const commit = useCallback(
    (digits: string) => {
      onChange(filterIntegerDigits(digits, maxDigits));
    },
    [maxDigits, onChange],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    commit(e.target.value);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text') ?? '';
    commit(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const allowed = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];
    if (allowed.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) {
      if (['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())) return;
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const { wrapper, label: labelBase, border, input: inputBase } = sizeStyles[size];

  const rangeError = useMemo(
    () => computeNumericRangeError(value, min, max, maxDigits, focused),
    [value, min, max, maxDigits, focused],
  );
  const displayError = error || rangeError;

  const isInvoice = accent === 'invoice';
  const isAdminEdit = accent === 'adminEdit';
  const borderShell =
    isInvoice ? 'rounded-md border shadow-sm' : isAdminEdit ? 'rounded-lg border' : border;
  const borderState = displayError
    ? 'border-red-300 bg-red-50'
    : isInvoice
      ? focused
        ? 'border-[var(--card-green)] ring-2 ring-[var(--card-green)] ring-offset-0 bg-white'
        : 'border-[var(--card-green)] bg-white'
      : isAdminEdit
        ? focused
          ? 'border-[var(--main-blue)] ring-2 ring-[var(--main-blue)]/25 bg-white'
          : 'border-gray-300 bg-white hover:border-gray-400'
        : focused
          ? 'border-blue-500 bg-blue-50/30'
          : 'border-gray-200 bg-white hover:border-gray-300';
  const inputPadding = isInvoice
    ? 'w-full py-2 px-3 rounded-md text-sm tabular-nums'
    : isAdminEdit
      ? 'w-full py-1.5 px-2 rounded-lg text-xs tabular-nums'
      : inputBase;

  return (
    <div className={`${wrapper} ${className}`.trim()}>
      {!hideLabel && (
        <label className={`${labelBase} ${labelClassName}`.trim()} htmlFor={fieldId}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div
        className={`relative ${borderShell} transition-all duration-200 ${borderState} ${
          disabled ? 'bg-gray-50 border-gray-200 opacity-90' : ''
        } ${size === 'form' ? 'flex min-h-[42px] items-center box-border' : ''}`}
      >
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={autoComplete}
          id={fieldId}
          name={name}
          aria-invalid={Boolean(displayError)}
          aria-required={required}
          aria-label={hideLabel ? ariaLabel ?? label : undefined}
          className={`${inputPadding} ${inputClassName} focus:outline-none transition-colors duration-200 ${
            disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'text-gray-900 placeholder-gray-400'
          }`}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>
      {displayError ? (
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 text-sm text-red-600 flex items-center gap-1"
          role="alert"
        >
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {displayError}
        </motion.p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
}
