import { VETERINARY_ROLE } from '@/shared/utils/role';
import type { RegistrationAccountType } from './types';

const API_BASE = () => process.env.NEXT_PUBLIC_API_BASE_URL || '';

/**
 * Public apply endpoints. Vet applications prefer `/veterinary/apply` when
 * available; fall back to `/agents/apply` with `role=VETERINARY` for older APIs.
 */
export async function submitRegistrationApplication(
  formData: FormData,
  role: RegistrationAccountType,
): Promise<unknown> {
  formData.set('role', role);

  const endpoints =
    role === VETERINARY_ROLE
      ? [`${API_BASE()}/veterinary/apply`, `${API_BASE()}/agents/apply`]
      : [`${API_BASE()}/agents/apply`];

  let lastError = 'Registration failed';
  for (const url of endpoints) {
    const response = await fetch(url, { method: 'POST', body: formData });
    if (response.ok) {
      return response.json();
    }
    if (response.status === 404 && endpoints.length > 1) {
      continue;
    }
    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    lastError = errorData.message || lastError;
    if (response.status !== 404) {
      throw new Error(lastError);
    }
  }
  throw new Error(lastError);
}

/**
 * Track a pending agent/vet application by email (OTP may follow).
 */
export async function trackRegistrationApplication(
  email: string,
): Promise<Response> {
  const formData = new URLSearchParams();
  formData.append('email', email);

  const tryUrls = [
    `${API_BASE()}/trackAgentApplication`,
    `${API_BASE()}/trackVeterinaryApplication`,
  ];

  let last: Response | null = null;
  for (const url of tryUrls) {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });
    last = response;
    if (response.ok || response.status !== 404) return response;
  }
  return last!;
}
