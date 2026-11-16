/**
 * Finance ledger route builders. All paths are camelCase under `/financeLedger`
 * and require a Bearer token (role FINANCE; admin/super admin read-only where noted
 * in the API documentation).
 *
 * Query conventions:
 * - arrays are comma-separated (`stage=PAID,BILLED`)
 * - a period is sent as `from`, `to` and optional `periodBy`
 * - paging is `page`, `pageSize`, `sort`
 */
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type PageQuery,
  type PeriodFilter,
} from '../domain';
import type { LedgerLinesQuery } from '../domain/ledger';
import type { MismatchesQuery } from '../domain/mismatches';
import type { PayableVetsQuery, PayoutsQuery } from '../domain/payouts';
import type { ReceiptsQuery, RemittanceRowsQuery } from '../domain/receipts';
import type { FinanceSummaryQuery } from '../domain/summary';
import type { StatementLinesQuery, StatementsQuery } from '../domain/statements';

type QueryValue = string | number | boolean | readonly string[] | null | undefined;

/** Builds `a=1&b=2`, skipping empty values. Returns '' when nothing is set. */
export function serializeQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
    } else {
      search.set(key, String(value));
    }
  }
  return search.toString();
}

const withQuery = (path: string, params: Record<string, QueryValue>): string => {
  const qs = serializeQuery(params);
  return qs ? `${path}?${qs}` : path;
};

const asList = <T extends string>(value: T | readonly T[] | undefined) =>
  value === undefined ? undefined : Array.isArray(value) ? value : [value as T];

export function pageParams(query: PageQuery = {}): Record<string, QueryValue> {
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(query.pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  return {
    page: Math.max(1, Math.floor(query.page ?? 1)),
    pageSize,
    sort: query.sort,
  };
}

export function periodParams(period?: PeriodFilter): Record<string, QueryValue> {
  return period ? { from: period.from, to: period.to, periodBy: period.by } : {};
}

const BASE = '/financeLedger';
const enc = encodeURIComponent;

export const FINANCE_LEDGER_ENDPOINTS = {
  /** GET — one row per month: paid, billed, received, outstanding, mismatches. */
  summary: (q: FinanceSummaryQuery): string =>
    withQuery(`${BASE}/summary`, {
      module: q.module,
      from: q.from,
      to: q.to,
      granularity: q.granularity,
    }),

  /** GET — every line in every stage (paginated). */
  lines: (q: LedgerLinesQuery): string =>
    withQuery(`${BASE}/lines`, {
      ...pageParams(q),
      ...periodParams(q.period),
      module: q.module,
      stage: asList(q.stage),
      source: q.source,
      vetId: q.vetId,
      statementId: q.statementId,
      payoutId: q.payoutId,
      hasOpenMismatch: q.hasOpenMismatch,
      search: q.search,
    }),

  /** GET — one line with its full timeline. */
  lineDetail: (lineId: string): string => `${BASE}/lines/${enc(lineId)}`,

  /** GET — vets with approved, unpaid lines (paginated). */
  payables: (q: PayableVetsQuery): string =>
    withQuery(`${BASE}/payables`, {
      ...pageParams(q),
      ...periodParams(q.period),
      module: q.module,
      search: q.search,
    }),

  /** GET (list) / POST (create). */
  payouts: (q?: PayoutsQuery): string =>
    q
      ? withQuery(`${BASE}/payouts`, {
          ...pageParams(q),
          ...periodParams(q.period),
          module: q.module,
          status: asList(q.status),
          vetId: q.vetId,
          search: q.search,
        })
      : `${BASE}/payouts`,
  payout: (id: string): string => `${BASE}/payouts/${enc(id)}`,
  payoutVets: (id: string, q?: PageQuery): string =>
    withQuery(`${BASE}/payouts/${enc(id)}/vets`, pageParams(q)),
  /** PUT */
  markPayoutPaid: (id: string): string => `${BASE}/payouts/${enc(id)}/markPaid`,
  /** PUT */
  cancelPayout: (id: string): string => `${BASE}/payouts/${enc(id)}/cancel`,

  statements: (q: StatementsQuery): string =>
    withQuery(`${BASE}/statements`, {
      ...pageParams(q),
      ...periodParams(q.period),
      module: q.module,
      status: asList(q.status),
      overdueOnly: q.overdueOnly,
    }),
  statement: (id: string): string => `${BASE}/statements/${enc(id)}`,
  statementLines: (id: string, q?: StatementLinesQuery): string =>
    withQuery(`${BASE}/statements/${enc(id)}/lines`, {
      ...pageParams(q),
      vetId: q?.vetId,
      withMismatch: q?.withMismatch,
      search: q?.search,
    }),
  /** GET — pre-flight blockers and warnings. */
  statementIssueChecks: (id: string): string =>
    `${BASE}/statements/${enc(id)}/issueChecks`,
  /** PUT */
  issueStatement: (id: string): string => `${BASE}/statements/${enc(id)}/issue`,
  /** PUT */
  writeOffStatement: (id: string): string =>
    `${BASE}/statements/${enc(id)}/writeOff`,

  /** GET (list) / POST (create). */
  receipts: (q?: ReceiptsQuery): string =>
    q
      ? withQuery(`${BASE}/receipts`, {
          ...pageParams(q),
          ...periodParams(q.period),
          module: q.module,
          statementId: q.statementId,
          search: q.search,
        })
      : `${BASE}/receipts`,
  receipt: (id: string): string => `${BASE}/receipts/${enc(id)}`,
  /** POST multipart: `file`, `module`, `statementIds` (comma-separated). */
  importRemittance: (): string => `${BASE}/receipts/importRemittance`,
  remittanceRows: (importId: string, q?: RemittanceRowsQuery): string =>
    withQuery(`${BASE}/receipts/imports/${enc(importId)}/rows`, {
      ...pageParams(q),
      matchStatus: asList(q?.matchStatus),
      search: q?.search,
    }),

  mismatches: (q: MismatchesQuery): string =>
    withQuery(`${BASE}/mismatches`, {
      ...pageParams(q),
      ...periodParams(q.period),
      module: q.module,
      status: asList(q.status),
      kind: q.kind,
      statementId: q.statementId,
      vetId: q.vetId,
      search: q.search,
    }),
  /** PUT */
  resolveMismatch: (id: string): string => `${BASE}/mismatches/${enc(id)}/resolve`,
} as const;
