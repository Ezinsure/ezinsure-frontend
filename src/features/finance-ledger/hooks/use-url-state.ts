'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useRef } from 'react';

export type UrlValue = string | number | boolean | string[];
export type UrlState = Record<string, UrlValue>;

const LIST_SEPARATOR = ',';

/** Reads one param using the default's type as the schema. */
function parseValue(raw: string | null, fallback: UrlValue): UrlValue {
  if (raw === null) return fallback;
  if (typeof fallback === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }
  if (typeof fallback === 'boolean') return raw === 'true';
  if (Array.isArray(fallback)) return raw ? raw.split(LIST_SEPARATOR) : [];
  return raw;
}

const serialize = (value: UrlValue): string =>
  Array.isArray(value) ? value.join(LIST_SEPARATOR) : String(value);

const isEqual = (a: UrlValue, b: UrlValue): boolean => serialize(a) === serialize(b);

export interface UrlStateApi<T extends UrlState> {
  values: T;
  /**
   * Merges `patch` into the URL. Changing anything other than `page` sends the
   * user back to page 1, because the old page may no longer exist.
   */
  setValues: (patch: Partial<T>) => void;
  /** Back to defaults. */
  reset: () => void;
}

/**
 * Keeps filters, sorting and paging in the query string so a view can be
 * refreshed, bookmarked and shared. Values equal to their default are left out
 * of the URL, and the default's type decides how each param is parsed.
 *
 * Pages that use this must render inside a `<Suspense>` boundary.
 */
export function useUrlState<T extends UrlState>(defaults: T): UrlStateApi<T> {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultsRef = useRef(defaults);

  const queryString = searchParams.toString();
  const values = useMemo(() => {
    const params = new URLSearchParams(queryString);
    const result: UrlState = {};
    for (const key of Object.keys(defaultsRef.current)) {
      result[key] = parseValue(params.get(key), defaultsRef.current[key]);
    }
    return result as T;
  }, [queryString]);

  // Router updates are async; this keeps two quick changes from overwriting each other.
  const latest = useRef(values);
  latest.current = values;

  const write = useCallback(
    (next: UrlState) => {
      latest.current = next as T;
      const params = new URLSearchParams(queryString);
      for (const [key, value] of Object.entries(next)) {
        if (isEqual(value, defaultsRef.current[key])) params.delete(key);
        else params.set(key, serialize(value));
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, queryString, router],
  );

  const setValues = useCallback(
    (patch: Partial<T>) => {
      const next: UrlState = { ...latest.current, ...(patch as UrlState) };
      const changesFilter = Object.keys(patch).some((key) => key !== 'page');
      if (changesFilter && !('page' in patch) && 'page' in next) next.page = 1;
      write(next);
    },
    [write],
  );

  const reset = useCallback(() => write({ ...defaultsRef.current }), [write]);

  return { values, setValues, reset };
}
