'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import { cx } from './cx';

interface SearchBoxProps {
  /** The search currently applied (usually from the URL). */
  value: string;
  /** Called after the user pauses typing, never on every keystroke. */
  onSearch: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function SearchBox({
  value,
  onSearch,
  placeholder = 'Search',
  debounceMs = 350,
  className,
}: SearchBoxProps) {
  const [text, setText] = useState(value);
  const debounced = useDebouncedValue(text, debounceMs);
  const lastEmitted = useRef(value);

  useEffect(() => {
    const next = debounced.trim();
    if (next === lastEmitted.current) return;
    lastEmitted.current = next;
    onSearch(next);
  }, [debounced, onSearch]);

  // Follow outside changes (e.g. "Clear filters") without fighting what the user is typing.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setText(value);
    }
  }, [value]);

  return (
    <div className={cx('relative', className)}>
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400 [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setText('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
