import { useAuth } from '@/context/AuthContext';
import { useCallback } from 'react';

/** True when the response indicates an invalid/expired session (not merely forbidden). */
function shouldForceLogoutOnError(status: number, errorMessage?: string): boolean {
  if (status === 403) return false;

  const msg = (errorMessage ?? '').toLowerCase();

  if (msg === 'jwt expired' || msg.includes('token expired') || msg.includes('invalid token')) {
    return true;
  }

  if (status !== 401) return false;

  // Role/permission denials are often returned as 401 — do not clear the session.
  if (
    msg.includes('forbidden') ||
    msg.includes('permission') ||
    msg.includes('not allowed') ||
    msg.includes('access denied') ||
    msg.includes('insufficient')
  ) {
    return false;
  }

  if (
    msg.includes('jwt') ||
    msg.includes('session') ||
    msg === 'unauthorized' ||
    msg.includes('not authenticated') ||
    msg.includes('authentication required')
  ) {
    return true;
  }

  return false;
}

/**
 * Hook that returns a shared API client.
 * It automatically attaches the Authorization header when a token is present
 * and forces logout when the backend reports an expired/invalid token.
 */
export const useApiClient = () => {
  const { token, forceLogout } = useAuth();

  const apiFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

      const baseHeaders: HeadersInit = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Only set JSON content type by default for non-FormData bodies.
      if (!isFormData && !(baseHeaders as Record<string, string>)['Content-Type']) {
        (baseHeaders as Record<string, string>)['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
        ...options,
        headers: baseHeaders,
      });

      if (!response.ok) {
        // Try to detect expired or invalid JWT
        let body: unknown;
        try {
          body = await response.clone().json();
        } catch {
          // ignore JSON parse errors
        }

        const errorMessage =
          typeof body === 'object' && body !== null && 'error' in body
            ? (body as { error?: string }).error
            : typeof body === 'object' && body !== null && 'message' in body
              ? (body as { message?: string }).message
              : undefined;

        if (shouldForceLogoutOnError(response.status, errorMessage)) {
          forceLogout();
          throw new Error('Session expired. Please log in again.');
        }
      }

      return response;
    },
    [forceLogout, token],
  );

  return { apiFetch };
};

