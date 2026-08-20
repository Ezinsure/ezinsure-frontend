'use client';

import { useCallback, useMemo } from 'react';
import { useApiClient } from '@/utils/apiClient';
import { EXTERNAL_VET_COMMISSION_ENDPOINTS } from './endpoints';
import type {
  CreateCommissionBatchInput,
  CreateExternalVetInput,
  ExternalVet,
  ExternalVetCommissionBatch,
  ExternalVetCommissionBatchSummary,
  ExternalVetCommissionStatus,
  ExternalVetPerformanceRow,
  ExternalVetsOverviewStats,
  PlatformVetSearchHit,
} from './domain';

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

async function errorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const payload = await readJson(response);
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error;
    }
  }
  return fallback;
}

export function useExternalVetCommissionsApi() {
  const { apiFetch } = useApiClient();

  const listExternalVets = useCallback(async (): Promise<ExternalVet[]> => {
    const response = await apiFetch(
      EXTERNAL_VET_COMMISSION_ENDPOINTS.listExternalVets(),
    );
    if (!response.ok) {
      throw new Error(await errorMessage(response, 'Failed to list external vets'));
    }
    return unwrapData<ExternalVet[]>(await readJson(response));
  }, [apiFetch]);

  const searchPlatformVets = useCallback(
    async (q: string): Promise<PlatformVetSearchHit[]> => {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.searchPlatformVets(q),
      );
      if (!response.ok) {
        throw new Error(
          await errorMessage(response, 'Failed to search platform vets'),
        );
      }
      return unwrapData<PlatformVetSearchHit[]>(await readJson(response));
    },
    [apiFetch],
  );

  const createExternalVet = useCallback(
    async (input: CreateExternalVetInput): Promise<ExternalVet> => {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.createExternalVet(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) {
        throw new Error(
          await errorMessage(response, 'Failed to create external vet'),
        );
      }
      return unwrapData<ExternalVet>(await readJson(response));
    },
    [apiFetch],
  );

  const listBatches = useCallback(
    async (
      status?: ExternalVetCommissionStatus | 'ALL',
    ): Promise<ExternalVetCommissionBatchSummary[]> => {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.listBatches(status),
      );
      if (!response.ok) {
        throw new Error(await errorMessage(response, 'Failed to list batches'));
      }
      return unwrapData<ExternalVetCommissionBatchSummary[]>(
        await readJson(response),
      );
    },
    [apiFetch],
  );

  const getBatch = useCallback(
    async (id: string): Promise<ExternalVetCommissionBatch | null> => {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.getBatch(id),
      );
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(await errorMessage(response, 'Failed to load batch'));
      }
      return unwrapData<ExternalVetCommissionBatch>(await readJson(response));
    },
    [apiFetch],
  );

  const createBatch = useCallback(
    async (
      input: CreateCommissionBatchInput,
    ): Promise<ExternalVetCommissionBatch> => {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.createBatch(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) {
        throw new Error(await errorMessage(response, 'Failed to create batch'));
      }
      return unwrapData<ExternalVetCommissionBatch>(await readJson(response));
    },
    [apiFetch],
  );

  const approveBatch = useCallback(
    async (id: string, note?: string): Promise<ExternalVetCommissionBatch> => {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.approveBatch(id),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note }),
        },
      );
      if (!response.ok) {
        throw new Error(await errorMessage(response, 'Failed to approve batch'));
      }
      return unwrapData<ExternalVetCommissionBatch>(await readJson(response));
    },
    [apiFetch],
  );

  const rejectBatch = useCallback(
    async (id: string, note: string): Promise<ExternalVetCommissionBatch> => {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.rejectBatch(id),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note }),
        },
      );
      if (!response.ok) {
        throw new Error(await errorMessage(response, 'Failed to reject batch'));
      }
      return unwrapData<ExternalVetCommissionBatch>(await readJson(response));
    },
    [apiFetch],
  );

  const initiatePayment = useCallback(
    async (id: string): Promise<ExternalVetCommissionBatch> => {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.initiatePayment(id),
        { method: 'PUT' },
      );
      if (!response.ok) {
        throw new Error(
          await errorMessage(response, 'Failed to initiate payment'),
        );
      }
      return unwrapData<ExternalVetCommissionBatch>(await readJson(response));
    },
    [apiFetch],
  );

  const markPaid = useCallback(
    async (id: string): Promise<ExternalVetCommissionBatch> => {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.markPaid(id),
        { method: 'PUT' },
      );
      if (!response.ok) {
        throw new Error(await errorMessage(response, 'Failed to mark paid'));
      }
      return unwrapData<ExternalVetCommissionBatch>(await readJson(response));
    },
    [apiFetch],
  );

  const initiatePaymentBulk = useCallback(
    async (ids: string[]): Promise<ExternalVetCommissionBatch[]> => {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.initiatePaymentBulk(),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await errorMessage(response, 'Failed to initiate payments'),
        );
      }
      return unwrapData<ExternalVetCommissionBatch[]>(await readJson(response));
    },
    [apiFetch],
  );

  const markPaidBulk = useCallback(
    async (ids: string[]): Promise<ExternalVetCommissionBatch[]> => {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.markPaidBulk(),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        },
      );
      if (!response.ok) {
        throw new Error(
          await errorMessage(response, 'Failed to mark batches paid'),
        );
      }
      return unwrapData<ExternalVetCommissionBatch[]>(await readJson(response));
    },
    [apiFetch],
  );

  const getOverview = useCallback(async (): Promise<ExternalVetsOverviewStats> => {
    const response = await apiFetch(
      EXTERNAL_VET_COMMISSION_ENDPOINTS.getOverview(),
    );
    if (!response.ok) {
      throw new Error(await errorMessage(response, 'Failed to load overview'));
    }
    return unwrapData<ExternalVetsOverviewStats>(await readJson(response));
  }, [apiFetch]);

  const getPerformance = useCallback(async (): Promise<
    ExternalVetPerformanceRow[]
  > => {
    const response = await apiFetch(
      EXTERNAL_VET_COMMISSION_ENDPOINTS.getPerformance(),
    );
    if (!response.ok) {
      throw new Error(await errorMessage(response, 'Failed to load performance'));
    }
    return unwrapData<ExternalVetPerformanceRow[]>(await readJson(response));
  }, [apiFetch]);

  return useMemo(
    () => ({
      listExternalVets,
      searchPlatformVets,
      createExternalVet,
      listBatches,
      getBatch,
      createBatch,
      approveBatch,
      rejectBatch,
      initiatePayment,
      markPaid,
      initiatePaymentBulk,
      markPaidBulk,
      getOverview,
      getPerformance,
    }),
    [
      listExternalVets,
      searchPlatformVets,
      createExternalVet,
      listBatches,
      getBatch,
      createBatch,
      approveBatch,
      rejectBatch,
      initiatePayment,
      markPaid,
      initiatePaymentBulk,
      markPaidBulk,
      getOverview,
      getPerformance,
    ],
  );
}
