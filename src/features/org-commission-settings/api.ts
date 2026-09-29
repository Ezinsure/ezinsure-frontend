'use client';

import { useCallback, useMemo } from 'react';
import { useApiClient } from '@/utils/apiClient';
import { COMPANY_COMMISSION_DEFAULTS_ENDPOINTS } from './endpoints';
import {
  FALLBACK_LIVESTOCK_COMPANY_COMMISSION_PERCENT,
  FALLBACK_MOTOR_COMPANY_COMMISSION_PERCENT,
  clampCommissionPercent,
  type CompanyCommissionDefaults,
} from './types';

function unwrapData(payload: unknown): unknown {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: unknown }).data;
  }
  return payload;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampCommissionPercent(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return clampCommissionPercent(n);
  }
  return fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function mapCompanyCommissionDefaults(
  raw: unknown,
): CompanyCommissionDefaults {
  const row =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    livestockCompanyCommissionPercent: asNumber(
      row.livestockCompanyCommissionPercent ??
        row.livestockPercent ??
        row.livestock,
      FALLBACK_LIVESTOCK_COMPANY_COMMISSION_PERCENT,
    ),
    motorCompanyCommissionPercent: asNumber(
      row.motorCompanyCommissionPercent ?? row.motorPercent ?? row.motor,
      FALLBACK_MOTOR_COMPANY_COMMISSION_PERCENT,
    ),
    updatedAt: asOptionalString(row.updatedAt),
    updatedById: asOptionalString(row.updatedById ?? row.updatedBy),
  };
}

export function fallbackCompanyCommissionDefaults(): CompanyCommissionDefaults {
  return {
    livestockCompanyCommissionPercent:
      FALLBACK_LIVESTOCK_COMPANY_COMMISSION_PERCENT,
    motorCompanyCommissionPercent: FALLBACK_MOTOR_COMPANY_COMMISSION_PERCENT,
  };
}

async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = (await response.json()) as {
      message?: string;
      error?: string;
    };
    return payload.message || payload.error || fallback;
  } catch {
    return fallback;
  }
}

export function useCompanyCommissionDefaultsApi() {
  const { apiFetch } = useApiClient();

  const getDefaults = useCallback(async (): Promise<CompanyCommissionDefaults> => {
    const response = await apiFetch(
      COMPANY_COMMISSION_DEFAULTS_ENDPOINTS.root(),
      { method: 'GET' },
    );

    if (response.ok) {
      const json = await response.json().catch(() => null);
      return mapCompanyCommissionDefaults(unwrapData(json));
    }

    // Endpoint not rolled out yet — use local fallbacks so create flows keep working.
    if (response.status === 404) {
      return fallbackCompanyCommissionDefaults();
    }

    throw new Error(
      await readErrorMessage(response, 'Failed to load commission defaults'),
    );
  }, [apiFetch]);

  const updateDefaults = useCallback(
    async (input: {
      livestockCompanyCommissionPercent: number;
      motorCompanyCommissionPercent: number;
    }): Promise<CompanyCommissionDefaults> => {
      const body = {
        livestockCompanyCommissionPercent: clampCommissionPercent(
          input.livestockCompanyCommissionPercent,
        ),
        motorCompanyCommissionPercent: clampCommissionPercent(
          input.motorCompanyCommissionPercent,
        ),
      };

      const response = await apiFetch(
        COMPANY_COMMISSION_DEFAULTS_ENDPOINTS.root(),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );

      if (response.ok) {
        const json = await response.json().catch(() => null);
        return mapCompanyCommissionDefaults(unwrapData(json) ?? body);
      }

      if (response.status === 404) {
        throw new Error(
          'Commission defaults are not available on the server yet. Ask the backend team to implement PUT /configurations/companyCommissionDefaults.',
        );
      }

      throw new Error(
        await readErrorMessage(response, 'Failed to save commission defaults'),
      );
    },
    [apiFetch],
  );

  return useMemo(
    () => ({ getDefaults, updateDefaults }),
    [getDefaults, updateDefaults],
  );
}
