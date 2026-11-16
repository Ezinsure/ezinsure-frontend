import type {
  DataEnvelope,
  FieldErrors,
  PageMeta,
  Paginated,
  RequestOptions,
} from '../domain/common';

export type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

/**
 * Error thrown for every non-2xx response from the finance ledger API.
 * Expected error body: `{ message: string, code?: string, fieldErrors?: { [field]: string } }`
 * (a legacy `{ error: string }` body is also understood).
 */
export class FinanceApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors?: FieldErrors;

  constructor(
    message: string,
    status: number,
    code?: string,
    fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = 'FinanceApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

interface ErrorBody {
  message?: unknown;
  error?: unknown;
  code?: unknown;
  fieldErrors?: unknown;
}

async function toApiError(response: Response): Promise<FinanceApiError> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Not JSON: fall through to the generic message.
  }
  const message =
    (typeof body.message === 'string' && body.message) ||
    (typeof body.error === 'string' && body.error) ||
    `Request failed (${response.status})`;
  const fieldErrors =
    body.fieldErrors && typeof body.fieldErrors === 'object'
      ? (body.fieldErrors as FieldErrors)
      : undefined;
  return new FinanceApiError(
    message,
    response.status,
    typeof body.code === 'string' ? body.code : undefined,
    fieldErrors,
  );
}

const newIdempotencyKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export interface FinanceHttp {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  send<T>(
    method: 'POST' | 'PUT',
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T>;
  postForm<T>(path: string, form: FormData, options?: RequestOptions): Promise<T>;
}

export function createFinanceHttp(apiFetch: ApiFetch): FinanceHttp {
  async function run<T>(path: string, init: RequestInit): Promise<T> {
    const response = await apiFetch(path, init);
    if (!response.ok) throw await toApiError(response);
    return (await response.json()) as T;
  }

  const mutationHeaders = (options?: RequestOptions): Record<string, string> => ({
    'Idempotency-Key': options?.idempotencyKey ?? newIdempotencyKey(),
  });

  return {
    get: (path, options) => run(path, { method: 'GET', signal: options?.signal }),
    send: (method, path, body, options) =>
      run(path, {
        method,
        signal: options?.signal,
        headers: mutationHeaders(options),
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    postForm: (path, form, options) =>
      run(path, {
        method: 'POST',
        signal: options?.signal,
        headers: mutationHeaders(options),
        body: form,
      }),
  };
}

/** Single-resource responses are `{ data: T }`. */
export const unwrapData = <T>(payload: DataEnvelope<T>): T => payload.data;

/** List responses are `{ data: T[], meta }`; tolerate a missing `meta` defensively. */
export function toPaginated<T>(payload: Partial<Paginated<T>> | T[]): Paginated<T> {
  const data = Array.isArray(payload) ? payload : (payload.data ?? []);
  const meta: Partial<PageMeta> = Array.isArray(payload) ? {} : (payload.meta ?? {});
  const pageSize = meta.pageSize ?? (data.length || 1);
  const total = meta.total ?? data.length;
  return {
    data,
    meta: {
      page: meta.page ?? 1,
      pageSize,
      total,
      totalPages: meta.totalPages ?? Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
