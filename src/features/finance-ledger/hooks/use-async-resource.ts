'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncResource<T> {
  /** Last successful result; kept while a newer request is in flight. */
  data: T | undefined;
  /** True only while there is nothing to show yet (first load, or after an error). */
  loading: boolean;
  /** True while a request is running, including refreshes that keep `data` visible. */
  fetching: boolean;
  error: string | undefined;
  reload: () => void;
}

interface Options {
  /** Skip fetching while false (e.g. waiting for a required filter). */
  enabled?: boolean;
}

const isAbort = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

const messageOf = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : 'Something went wrong. Please try again.';

/**
 * Runs `fetcher` whenever its identity changes (wrap it in `useCallback` with
 * the filters it depends on). The previous request is aborted, and a late
 * response from an older request can never overwrite a newer one, so quick
 * filter changes never show stale data.
 */
export function useAsyncResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  { enabled = true }: Options = {},
): AsyncResource<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [fetching, setFetching] = useState(enabled);
  const [reloadToken, setReloadToken] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setFetching(false);
      return;
    }
    const controller = new AbortController();
    const id = ++requestId.current;
    setFetching(true);
    setError(undefined);

    fetcher(controller.signal)
      .then((result) => {
        if (id === requestId.current) setData(result);
      })
      .catch((err: unknown) => {
        if (isAbort(err) || id !== requestId.current) return;
        setData(undefined);
        setError(messageOf(err));
      })
      .finally(() => {
        if (id === requestId.current) setFetching(false);
      });

    return () => controller.abort();
  }, [fetcher, enabled, reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  return { data, loading: data === undefined && fetching, fetching, error, reload };
}
