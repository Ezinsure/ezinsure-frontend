/**
 * Shared primitives for the finance ledger contract.
 *
 * Conventions (mirrored 1:1 in the backend API documentation):
 * - Dates without time are `YYYY-MM-DD`; timestamps are ISO-8601 UTC strings.
 * - Money is a whole number in the currency's major unit (RWF has no decimals).
 *   Every resource that carries money also carries its `currency` (ISO 4217).
 * - Field names are camelCase.
 */

export type DateOnly = string;
export type IsoDateTime = string;
export type MoneyAmount = number;
export type CurrencyCode = string;

/** Product line a ledger entry belongs to. Only `livestock` is implemented first. */
export type FinanceModule = 'livestock' | 'motor';

/** Where a line originated: a platform vet's application or an external-vet request. */
export const LEDGER_SOURCES = ['PLATFORM_VET', 'EXTERNAL_VET'] as const;
export type LedgerSource = (typeof LEDGER_SOURCES)[number];

export interface ActorRef {
  id: string;
  name: string;
  role?: string;
}

export interface VetRef {
  id: string;
  name: string;
  phoneNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  district?: string;
}

/* ------------------------------ pagination ------------------------------ */

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export interface PageQuery {
  /** 1-based. */
  page?: number;
  /** 1–100, default 25. */
  pageSize?: number;
  /** Comma-separated fields; prefix with `-` for descending, e.g. `-paidAt,vetName`. */
  sort?: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Envelope for every list endpoint. */
export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/** Envelope for every single-resource endpoint. */
export interface DataEnvelope<T> {
  data: T;
}

/* -------------------------------- periods -------------------------------- */

/** Which date a period filter is applied to. */
export const PERIOD_BASES = [
  'submittedAt',
  'approvedAt',
  'paidAt',
  'billedAt',
  'reimbursedAt',
] as const;
export type PeriodBasis = (typeof PERIOD_BASES)[number];

export interface PeriodFilter {
  from: DateOnly;
  to: DateOnly;
  /** Defaults are endpoint-specific and documented per endpoint. */
  by?: PeriodBasis;
}

/* -------------------------------- requests -------------------------------- */

/** Field-level validation messages keyed by input field name. */
export type FieldErrors = Record<string, string>;

export interface RequestOptions {
  signal?: AbortSignal;
  /**
   * Sent as the `Idempotency-Key` header on state-changing calls so a retried
   * request can never create a duplicate payout, receipt, etc.
   */
  idempotencyKey?: string;
}
