import { useAuth } from '@/context/AuthContext';

/**
 * Hook that returns a shared API client.
 * It automatically attaches the Authorization header when a token is present
 * and forces logout when the backend reports an expired/invalid token.
 */
export const useApiClient = () => {
  const { token, forceLogout } = useAuth();

  const apiFetch = async (path: string, options: RequestInit = {}) => {
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
          : undefined;

      if (response.status === 401 || errorMessage === 'jwt expired') {
        forceLogout();
        throw new Error('Session expired. Please log in again.');
      }
    }

    return response;
  };

  return { apiFetch };
};

