'use client';

/**
 * ComboboxField
 *
 * A fully accessible, searchable select field (ARIA combobox pattern).
 * Accepts any static array of string options and filters them in real-time
 * as the user types — no async fetching required.
 *
 * Usage:
 *   <ComboboxField
 *     label="Vehicle Type"
 *     options={carTypes}
 *     value={formState.vehicleType}
 *     onChange={(val) => setFormState(prev => ({ ...prev, vehicleType: val }))}
 *     placeholder="Search vehicle type…"
 *     required
 *     error={errors.vehicleType}
 *   />
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useId,
  KeyboardEvent,
} from 'react';
import { ChevronDown, X, Search } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComboboxFieldProps {
  /** The currently selected value */
  value: string;
  /** Called with the newly selected (or cleared) value */
  onChange: (value: string) => void;
  /** Full list of options to search through */
  options: readonly string[];
  /** Accessible label rendered above the field */
  label?: string;
  /** Placeholder text shown when no value is selected */
  placeholder?: string;
  /** Message shown when no options match the current query */
  noResultsMessage?: string;
  /** Validation error message */
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Strips non-alphanumeric characters and normalises whitespace for fuzzy matching */
function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ComboboxField({
  value,
  onChange,
  options,
  label,
  placeholder = 'Search…',
  noResultsMessage = 'No results found',
  error,
  required = false,
  disabled = false,
  className = '',
}: ComboboxFieldProps) {
  const uid = useId();
  const listboxId = `combobox-listbox-${uid}`;

  const [isOpen,      setIsOpen]      = useState(false);
  const [query,       setQuery]       = useState('');
  const [highlighted, setHighlighted] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const listRef      = useRef<HTMLUListElement>(null);

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filteredOptions = useMemo<readonly string[]>(() => {
    if (!query.trim()) return options;
    const q = normalise(query);
    return options.filter(opt => normalise(opt).includes(q));
  }, [options, query]);

  // ── Reset internal state when closed ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setHighlighted(-1);
    }
  }, [isOpen]);

  // ── Reset highlight when filtered list changes ────────────────────────────────
  useEffect(() => {
    setHighlighted(-1);
  }, [filteredOptions]);

  // ── Click-outside closes the dropdown ────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  // ── Scroll highlighted row into view ─────────────────────────────────────────
  useEffect(() => {
    if (highlighted < 0 || !listRef.current) return;
    const item = listRef.current.children[highlighted] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const openDropdown = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    // Small timeout ensures the input is rendered before focusing
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [disabled]);

  const selectOption = useCallback(
    (option: string) => {
      onChange(option);
      setIsOpen(false);
    },
    [onChange],
  );

  const clearValue = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
      setIsOpen(false);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlighted(h => (h < filteredOptions.length - 1 ? h + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlighted(h => (h > 0 ? h - 1 : filteredOptions.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlighted >= 0 && filteredOptions[highlighted]) {
            selectOption(filteredOptions[highlighted]);
          } else if (filteredOptions.length === 1) {
            selectOption(filteredOptions[0]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        case 'Tab':
          setIsOpen(false);
          break;
      }
    },
    [filteredOptions, highlighted, selectOption],
  );

  // ── Inline match highlighting ─────────────────────────────────────────────────
  const renderOptionLabel = useCallback(
    (option: string) => {
      if (!query.trim()) return <span>{option}</span>;
      const lc  = option.toLowerCase();
      const q   = query.toLowerCase();
      const idx = lc.indexOf(q);
      if (idx === -1) return <span>{option}</span>;
      return (
        <>
          {option.slice(0, idx)}
          <strong className="font-semibold text-blue-600">
            {option.slice(idx, idx + query.length)}
          </strong>
          {option.slice(idx + query.length)}
        </>
      );
    },
    [query],
  );

  // ── Derived ───────────────────────────────────────────────────────────────────
  const hasValue    = Boolean(value);
  const borderClass = error
    ? 'border-red-400 focus-within:ring-red-300'
    : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-blue-200';

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className={`relative ${className}`} ref={containerRef}>

      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden>*</span>}
        </label>
      )}

      {/* Trigger box */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-required={required}
        aria-disabled={disabled}
        onClick={openDropdown}
        className={[
          'flex items-center gap-2 w-full min-h-[42px] px-3 py-2',
          'rounded-lg border bg-white transition-all duration-150',
          'focus-within:outline-none focus-within:ring-2',
          borderClass,
          disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'cursor-text',
        ].join(' ')}
      >
        {/* Search icon */}
        <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" aria-hidden />

        {isOpen ? (
          /* Live search input */
          <input
            ref={inputRef}
            type="text"
            role="searchbox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
        ) : (
          /* Selected-value display */
          <span
            className={`flex-1 text-sm truncate ${
              hasValue ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            {hasValue ? value : placeholder}
          </span>
        )}

        {/* Clear button */}
        {hasValue && !disabled && (
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={clearValue}
            aria-label="Clear selection"
            className="shrink-0 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
          </button>
        )}

        {/* Chevron */}
        {!disabled && (
          <ChevronDown
            aria-hidden
            className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {filteredOptions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">
              {noResultsMessage}
            </p>
          ) : (
            <ul
              id={listboxId}
              ref={listRef}
              role="listbox"
              aria-label={label ?? placeholder}
              className="max-h-56 overflow-y-auto py-1"
            >
              {filteredOptions.map((option, index) => {
                const isSelected    = option === value;
                const isHighlighted = index === highlighted;
                return (
                  <li
                    key={option}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => selectOption(option)}
                    onMouseEnter={() => setHighlighted(index)}
                    className={[
                      'flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors',
                      isHighlighted || isSelected
                        ? 'bg-blue-50 text-blue-900'
                        : 'text-gray-800 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <span>{renderOptionLabel(option)}</span>
                    {isSelected && (
                      <svg
                        className="h-4 w-4 text-blue-600 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Validation error */}
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
