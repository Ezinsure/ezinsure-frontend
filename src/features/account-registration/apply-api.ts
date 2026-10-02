import { VETERINARY_ROLE } from '@/shared/utils/role';
import type { RegistrationAccountType } from './types';

const API_BASE = () => process.env.NEXT_PUBLIC_API_BASE_URL || '';

/** Track/verify responses plus the role implied by the endpoint that answered. */
export type RegistrationApiResult = {
  response: Response;
  /**
   * Weak role signal: which role-specific endpoint returned the record. Used
   * only when the payload itself carries no role information.
   */
  endpointRole?: RegistrationAccountType;
};

async function firstMatchingEndpoint(
  attempts: { url: string; endpointRole?: RegistrationAccountType }[],
  init: RequestInit,
): Promise<RegistrationApiResult> {
  let last: RegistrationApiResult | null = null;
  for (const attempt of attempts) {
    const response = await fetch(attempt.url, init);
    last = { response, endpointRole: attempt.endpointRole };
    // Only a missing route justifies trying the next variant.
    if (response.ok || response.status !== 404) return last;
  }
  return last!;
}

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
): Promise<RegistrationApiResult> {
  const body = new URLSearchParams();
  body.append('email', email);

  return firstMatchingEndpoint(
    [
      { url: `${API_BASE()}/trackAgentApplication`, endpointRole: 'AGENT' },
      {
        url: `${API_BASE()}/trackVeterinaryApplication`,
        endpointRole: VETERINARY_ROLE,
      },
    ],
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    },
  );
}

/** Verify the emailed OTP and load the tracked application. */
export async function verifyRegistrationOtp(
  otp: string,
): Promise<RegistrationApiResult> {
  const body = new URLSearchParams();
  body.append('otp', otp);

  return firstMatchingEndpoint(
    [
      { url: `${API_BASE()}/verifyAgentOtp` },
      { url: `${API_BASE()}/verifyVeterinaryOtp`, endpointRole: VETERINARY_ROLE },
    ],
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    },
  );
}

/**
 * Resubmit an application that was sent back for action. Vets prefer the
 * veterinary route when the API exposes one.
 */
export async function updateRegistrationApplication(
  formData: FormData,
  role: RegistrationAccountType,
): Promise<unknown> {
  const attempts =
    role === VETERINARY_ROLE
      ? [
          `${API_BASE()}/updateVeterinaryApplication`,
          `${API_BASE()}/updateAgentApplication`,
        ]
      : [`${API_BASE()}/updateAgentApplication`];

  const fallbackError = 'Failed to update application';
  for (const [index, url] of attempts.entries()) {
    const response = await fetch(url, {
      method: 'PUT',
      credentials: 'include',
      body: formData,
    });

    if (response.ok) {
      return response.json().catch(() => null);
    }

    const isLast = index === attempts.length - 1;
    if (response.status === 404 && !isLast) continue;

    const errorData = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(errorData.message || fallbackError);
  }

  throw new Error(fallbackError);
}
