'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, Hash } from 'lucide-react';
import {
  INSURANCE_MONTH_DURATION_VALUES,
  formatDaysDuration,
  parseInsuranceDuration,
  type InsuranceMonthDuration,
} from '@/utils/insurance-duration';
import { NumericInputField } from '@/components/ui/numeric-input-field';

export interface InsuranceDurationFieldProps {
  id?: string;
  /** e.g. "Insurance duration" — shown above the unit toggle (avoids duplicating inner labels). */
  topLabel?: string;
  /** Stored value: "6 Months", "14 Days", "" (days, not filled), or legacy "12" */
  value: string;
  onChange: (next: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Min days when unit is days */
  minDays?: number;
  maxDays?: number;
  size?: 'default' | 'compact';
}

export function InsuranceDurationField({
  id = 'insuranceDuration',
  topLabel,
  value,
  onChange,
  error,
  required = true,
  disabled = false,
  className = '',
  minDays = 1,
  maxDays = 366,
  size = 'default',
}: InsuranceDurationFieldProps) {
  const parsed = useMemo(() => parseInsuranceDuration(value), [value]);
  const lastMonthsRef = useRef<InsuranceMonthDuration>(parsed.monthsValue);

  useEffect(() => {
    if (parsed.unit === 'months') {
      lastMonthsRef.current = parsed.monthsValue;
    }
  }, [parsed.monthsValue, parsed.unit]);

  const [daysDraft, setDaysDraft] = useState(parsed.daysValue);
  useEffect(() => {
    if (parsed.unit === 'days') {
      setDaysDraft(parsed.daysValue);
    }
  }, [parsed.unit, parsed.daysValue, value]);

  const setMonths = useCallback(() => {
    if (parsed.unit === 'months') return;
    onChange(lastMonthsRef.current);
  }, [onChange, parsed.unit]);

  const setDays = useCallback(() => {
    if (parsed.unit === 'days') return;
    onChange('');
  }, [onChange, parsed.unit]);

  const onMonthsSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as InsuranceMonthDuration;
    lastMonthsRef.current = v;
    onChange(v);
  };

  const onDaysDigitsChange = (digits: string) => {
    setDaysDraft(digits);
    if (!digits.trim()) {
      onChange('');
      return;
    }
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n) || n < 1) {
      onChange('');
      return;
    }
    const clamped = Math.min(maxDays, Math.max(minDays, n));
    onChange(formatDaysDuration(clamped));
  };

  const isCompact = size === 'compact';
  const segBase =
    'flex-1 cursor-pointer flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 px-3 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--main-blue)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const segInactive = 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50';
  const segActive = 'border-[var(--main-blue)] bg-[var(--main-blue)] text-white shadow-md';

  const showInnerMonthLabel = !topLabel;

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      {topLabel ? (
        <div
          className={`block font-medium text-gray-700 ${isCompact ? 'text-xs mb-1' : 'text-sm mb-1'}`}
        >
          {topLabel}
          {required && <span className="text-[var(--error-red)] ml-1">*</span>}
        </div>
      ) : null}
      <div className="flex flex-col sm:flex-row gap-2" role="group" aria-label="Duration unit">
        <button
          type="button"
          disabled={disabled}
          onClick={setMonths}
          className={`${segBase} ${parsed.unit === 'months' ? segActive : segInactive}`}
        >
          <CalendarRange className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          <span>Months</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={setDays}
          className={`${segBase} ${parsed.unit === 'days' ? segActive : segInactive}`}
        >
          <Hash className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          <span>Days</span>
        </button>
      </div>

      {parsed.unit === 'months' ? (
        <div>
          {showInnerMonthLabel ? (
            <label
              htmlFor={id}
              className={`block font-medium text-gray-700 ${isCompact ? 'text-xs mb-1' : 'text-sm mb-1'}`}
            >
              Duration
              {required && <span className="text-[var(--error-red)] ml-1">*</span>}
            </label>
          ) : null}
          <select
            id={id}
            name="insuranceDuration"
            value={parsed.monthsValue}
            onChange={onMonthsSelect}
            disabled={disabled}
            aria-label={topLabel ? `${topLabel}, months` : 'Duration in months'}
            className={`w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-[var(--main-blue)] focus:ring-2 focus:ring-[var(--main-blue)]/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 ${
              isCompact ? 'py-2 px-2.5 text-sm' : 'py-2 px-3'
            }`}
          >
            {INSURANCE_MONTH_DURATION_VALUES.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <NumericInputField
          label="Number of days"
          name="insuranceDurationDays"
          id={`${id}-days`}
          value={daysDraft}
          onChange={onDaysDigitsChange}
          required={required}
          disabled={disabled}
          error={error}
          maxDigits={3}
          placeholder={String(minDays)}
          size={size}
          className="mb-0"
        />
      )}

      {parsed.unit === 'months' && error ? (
        <p className="text-sm text-[var(--error-red)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
