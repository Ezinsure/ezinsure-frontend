import { useAuth } from '@/context/AuthContext';

/**
 * Hook that returns a shared API client.
 * It automatically attaches the Authorization header when a token is present
 * and forces logout when the backend reports an expired/invalid token.
 */
export const useApiClient = () => {
  const { token, forceLogout } = useAuth();

  const apiFetch = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`,
      {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    );

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

