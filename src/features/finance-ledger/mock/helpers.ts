import { FinanceApiError } from '../api/http';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type PageQuery,
  type Paginated,
  type PeriodFilter,
} from '../domain';

/** Small deterministic PRNG so fixtures are identical on every load. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const toIso = (date: Date): string => date.toISOString();

export const toList = <T>(value: T | readonly T[] | undefined): readonly T[] | undefined =>
  value === undefined ? undefined : Array.isArray(value) ? value : [value as T];

/** Applies `sort=-field,other` and returns a new array. */
export function sortRows<T>(rows: readonly T[], sort?: string): T[] {
  const copy = [...rows];
  const keys = (sort ?? '').split(',').filter(Boolean);
  if (!keys.length) return copy;
  return copy.sort((a, b) => {
    for (const key of keys) {
      const desc = key.startsWith('-');
      const field = (desc ? key.slice(1) : key) as keyof T;
      const av = a[field] as unknown as string | number | null | undefined;
      const bv = b[field] as unknown as string | number | null | undefined;
      if (av === bv) continue;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : 1;
      return desc ? -cmp : cmp;
    }
    return 0;
  });
}

/** Server-style pagination over an in-memory list. */
export function paginate<T>(rows: readonly T[], query: PageQuery = {}): Paginated<T> {
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(query.pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, Math.floor(query.page ?? 1)), totalPages);
  const start = (page - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    meta: { page, pageSize, total, totalPages },
  };
}

/** Inclusive check of an ISO timestamp / date against `from..to` (date-only strings). */
export function inPeriod(value: string | undefined, period?: PeriodFilter): boolean {
  if (!period) return true;
  if (!value) return false;
  const day = value.slice(0, 10);
  return day >= period.from && day <= period.to;
}

export const matchesSearch = (
  query: string | undefined,
  ...fields: Array<string | undefined>
): boolean => {
  const q = query?.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f?.toLowerCase().includes(q));
};

export const notFound = (what: string): FinanceApiError =>
  new FinanceApiError(`${what} not found`, 404, 'NOT_FOUND');

export const conflict = (message: string, code: string): FinanceApiError =>
  new FinanceApiError(message, 409, code);

export const invalid = (
  message: string,
  fieldErrors?: Record<string, string>,
): FinanceApiError => new FinanceApiError(message, 422, 'VALIDATION_FAILED', fieldErrors);

/** Simulated network latency so loading states are exercised in demo mode. */
export const delay = (ms = 250): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
