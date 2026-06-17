/**
 * Shared HTTP helpers for livestock veterinary API calls.
 * Keeps error parsing and JSON handling consistent across the feature.
 */

export type ApiFetch = (path: string, options?: RequestInit) => Promise<Response>;

export interface ApiErrorBody {
  message?: string;
  error?: string;
  details?: string[] | Record<string, string>;
}

export class LivestockApiError extends Error {
  readonly status: number;
  readonly details?: string[] | Record<string, string>;

  constructor(message: string, status: number, details?: string[] | Record<string, string>) {
    super(message);
    this.name = 'LivestockApiError';
    this.status = status;
    this.details = details;
  }
}

export function formatApiErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === 'object' && payload !== null) {
    const p = payload as ApiErrorBody;
    if (Array.isArray(p.details) && p.details.length > 0) {
      return p.details.join('; ');
    }
    return p.message || p.error || `Request failed (${status})`;
  }
  return `Request failed (${status})`;
}

export async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function requestJson<T = unknown>(
  apiFetch: ApiFetch,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await apiFetch(path, options);
  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    const body = payload as ApiErrorBody;
    throw new LivestockApiError(
      formatApiErrorMessage(payload, response.status),
      response.status,
      body.details,
    );
  }

  return payload as T;
}

export function unwrapEntityPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const root = payload as Record<string, unknown>;
  return root.data ?? root.application ?? payload;
}
