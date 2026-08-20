'use client';

import { useCallback, useMemo } from 'react';
import { useApiClient } from '@/utils/apiClient';
import { useAuth } from '@/context/AuthContext';
import { EXTERNAL_VET_COMMISSION_ENDPOINTS } from './endpoints';
import { mockExternalVetCommissionsApi } from './mock-data';
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

function shouldFallbackToMock(response: Response | null, error: unknown): boolean {
  if (error) return true;
  if (!response) return true;
  return response.status === 404 || response.status >= 500;
}

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

export function useExternalVetCommissionsApi() {
  const { apiFetch } = useApiClient();
  const { user } = useAuth();

  const actor = useMemo(
    () =>
      user
        ? { id: user._id, name: user.fullName || user.email }
        : undefined,
    [user],
  );

  const listExternalVets = useCallback(async (): Promise<ExternalVet[]> => {
    try {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.listExternalVets(),
      );
      if (shouldFallbackToMock(response, null)) {
        return mockExternalVetCommissionsApi.listExternalVets();
      }
      if (!response.ok) throw new Error('Failed to list external vets');
      return unwrapData<ExternalVet[]>(await readJson(response));
    } catch (error) {
      if (shouldFallbackToMock(null, error)) {
        return mockExternalVetCommissionsApi.listExternalVets();
      }
      throw error;
    }
  }, [apiFetch]);

  const searchPlatformVets = useCallback(
    async (q: string): Promise<PlatformVetSearchHit[]> => {
      try {
        const response = await apiFetch(
          EXTERNAL_VET_COMMISSION_ENDPOINTS.searchPlatformVets(q),
        );
        if (shouldFallbackToMock(response, null)) {
          return mockExternalVetCommissionsApi.searchPlatformVets(q);
        }
        if (!response.ok) throw new Error('Failed to search platform vets');
        return unwrapData<PlatformVetSearchHit[]>(await readJson(response));
      } catch (error) {
        if (shouldFallbackToMock(null, error)) {
          return mockExternalVetCommissionsApi.searchPlatformVets(q);
        }
        throw error;
      }
    },
    [apiFetch],
  );

  const createExternalVet = useCallback(
    async (input: CreateExternalVetInput): Promise<ExternalVet> => {
      try {
        const response = await apiFetch(
          EXTERNAL_VET_COMMISSION_ENDPOINTS.createExternalVet(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          },
        );
        if (shouldFallbackToMock(response, null)) {
          return mockExternalVetCommissionsApi.createExternalVet(input, actor);
        }
        if (!response.ok) throw new Error('Failed to create external vet');
        return unwrapData<ExternalVet>(await readJson(response));
      } catch (error) {
        if (shouldFallbackToMock(null, error)) {
          return mockExternalVetCommissionsApi.createExternalVet(input, actor);
        }
        throw error;
      }
    },
    [actor, apiFetch],
  );

  const listBatches = useCallback(
    async (
      status?: ExternalVetCommissionStatus | 'ALL',
    ): Promise<ExternalVetCommissionBatchSummary[]> => {
      try {
        const response = await apiFetch(
          EXTERNAL_VET_COMMISSION_ENDPOINTS.listBatches(status),
        );
        if (shouldFallbackToMock(response, null)) {
          return mockExternalVetCommissionsApi.listBatches(status);
        }
        if (!response.ok) throw new Error('Failed to list batches');
        return unwrapData<ExternalVetCommissionBatchSummary[]>(
          await readJson(response),
        );
      } catch (error) {
        if (shouldFallbackToMock(null, error)) {
          return mockExternalVetCommissionsApi.listBatches(status);
        }
        throw error;
      }
    },
    [apiFetch],
  );

  const getBatch = useCallback(
    async (id: string): Promise<ExternalVetCommissionBatch | null> => {
      try {
        const response = await apiFetch(
          EXTERNAL_VET_COMMISSION_ENDPOINTS.getBatch(id),
        );
        if (shouldFallbackToMock(response, null)) {
          return mockExternalVetCommissionsApi.getBatch(id);
        }
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('Failed to load batch');
        return unwrapData<ExternalVetCommissionBatch>(await readJson(response));
      } catch (error) {
        if (shouldFallbackToMock(null, error)) {
          return mockExternalVetCommissionsApi.getBatch(id);
        }
        throw error;
      }
    },
    [apiFetch],
  );

  const createBatch = useCallback(
    async (
      input: CreateCommissionBatchInput,
    ): Promise<ExternalVetCommissionBatch> => {
      try {
        const response = await apiFetch(
          EXTERNAL_VET_COMMISSION_ENDPOINTS.createBatch(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          },
        );
        if (shouldFallbackToMock(response, null)) {
          return mockExternalVetCommissionsApi.createBatch(input, actor);
        }
        if (!response.ok) throw new Error('Failed to create batch');
        return unwrapData<ExternalVetCommissionBatch>(await readJson(response));
      } catch (error) {
        if (shouldFallbackToMock(null, error)) {
          return mockExternalVetCommissionsApi.createBatch(input, actor);
        }
        throw error;
      }
    },
    [actor, apiFetch],
  );

  const approveBatch = useCallback(
    async (id: string, note?: string): Promise<ExternalVetCommissionBatch> => {
      try {
        const response = await apiFetch(
          EXTERNAL_VET_COMMISSION_ENDPOINTS.approveBatch(id),
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note }),
          },
        );
        if (shouldFallbackToMock(response, null)) {
          return mockExternalVetCommissionsApi.approveBatch(id, note, actor);
        }
        if (!response.ok) throw new Error('Failed to approve batch');
        return unwrapData<ExternalVetCommissionBatch>(await readJson(response));
      } catch (error) {
        if (shouldFallbackToMock(null, error)) {
          return mockExternalVetCommissionsApi.approveBatch(id, note, actor);
        }
        throw error;
      }
    },
    [actor, apiFetch],
  );

  const rejectBatch = useCallback(
    async (id: string, note: string): Promise<ExternalVetCommissionBatch> => {
      try {
        const response = await apiFetch(
          EXTERNAL_VET_COMMISSION_ENDPOINTS.rejectBatch(id),
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note }),
          },
        );
        if (shouldFallbackToMock(response, null)) {
          return mockExternalVetCommissionsApi.rejectBatch(id, note, actor);
        }
        if (!response.ok) throw new Error('Failed to reject batch');
        return unwrapData<ExternalVetCommissionBatch>(await readJson(response));
      } catch (error) {
        if (shouldFallbackToMock(null, error)) {
          return mockExternalVetCommissionsApi.rejectBatch(id, note, actor);
        }
        throw error;
      }
    },
    [actor, apiFetch],
  );

  const initiatePayment = useCallback(
    async (id: string): Promise<ExternalVetCommissionBatch> => {
      try {
        const response = await apiFetch(
          EXTERNAL_VET_COMMISSION_ENDPOINTS.initiatePayment(id),
          { method: 'PUT' },
        );
        if (shouldFallbackToMock(response, null)) {
          return mockExternalVetCommissionsApi.initiatePayment(id, actor);
        }
        if (!response.ok) throw new Error('Failed to initiate payment');
        return unwrapData<ExternalVetCommissionBatch>(await readJson(response));
      } catch (error) {
        if (shouldFallbackToMock(null, error)) {
          return mockExternalVetCommissionsApi.initiatePayment(id, actor);
        }
        throw error;
      }
    },
    [actor, apiFetch],
  );

  const markPaid = useCallback(
    async (id: string): Promise<ExternalVetCommissionBatch> => {
      try {
        const response = await apiFetch(
          EXTERNAL_VET_COMMISSION_ENDPOINTS.markPaid(id),
          { method: 'PUT' },
        );
        if (shouldFallbackToMock(response, null)) {
          return mockExternalVetCommissionsApi.markPaid(id, actor);
        }
        if (!response.ok) throw new Error('Failed to mark paid');
        return unwrapData<ExternalVetCommissionBatch>(await readJson(response));
      } catch (error) {
        if (shouldFallbackToMock(null, error)) {
          return mockExternalVetCommissionsApi.markPaid(id, actor);
        }
        throw error;
      }
    },
    [actor, apiFetch],
  );

  const initiatePaymentBulk = useCallback(
    async (ids: string[]): Promise<ExternalVetCommissionBatch[]> => {
      try {
        const response = await apiFetch(
          EXTERNAL_VET_COMMISSION_ENDPOINTS.initiatePaymentBulk(),
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
          },
        );
        if (shouldFallbackToMock(response, null)) {
          return mockExternalVetCommissionsApi.initiatePaymentBulk(ids, actor);
        }
        if (!response.ok) throw new Error('Failed to initiate payments');
        return unwrapData<ExternalVetCommissionBatch[]>(await readJson(response));
      } catch (error) {
        if (shouldFallbackToMock(null, error)) {
          return mockExternalVetCommissionsApi.initiatePaymentBulk(ids, actor);
        }
        throw error;
      }
    },
    [actor, apiFetch],
  );

  const markPaidBulk = useCallback(
    async (ids: string[]): Promise<ExternalVetCommissionBatch[]> => {
      try {
        const response = await apiFetch(
          EXTERNAL_VET_COMMISSION_ENDPOINTS.markPaidBulk(),
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
          },
        );
        if (shouldFallbackToMock(response, null)) {
          return mockExternalVetCommissionsApi.markPaidBulk(ids, actor);
        }
        if (!response.ok) throw new Error('Failed to mark batches paid');
        return unwrapData<ExternalVetCommissionBatch[]>(await readJson(response));
      } catch (error) {
        if (shouldFallbackToMock(null, error)) {
          return mockExternalVetCommissionsApi.markPaidBulk(ids, actor);
        }
        throw error;
      }
    },
    [actor, apiFetch],
  );

  const getOverview = useCallback(async (): Promise<ExternalVetsOverviewStats> => {
    try {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.getOverview(),
      );
      if (shouldFallbackToMock(response, null)) {
        return mockExternalVetCommissionsApi.getOverview();
      }
      if (!response.ok) throw new Error('Failed to load overview');
      return unwrapData<ExternalVetsOverviewStats>(await readJson(response));
    } catch (error) {
      if (shouldFallbackToMock(null, error)) {
        return mockExternalVetCommissionsApi.getOverview();
      }
      throw error;
    }
  }, [apiFetch]);

  const getPerformance = useCallback(async (): Promise<
    ExternalVetPerformanceRow[]
  > => {
    try {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.getPerformance(),
      );
      if (shouldFallbackToMock(response, null)) {
        return mockExternalVetCommissionsApi.getPerformance();
      }
      if (!response.ok) throw new Error('Failed to load performance');
      return unwrapData<ExternalVetPerformanceRow[]>(await readJson(response));
    } catch (error) {
      if (shouldFallbackToMock(null, error)) {
        return mockExternalVetCommissionsApi.getPerformance();
      }
      throw error;
    }
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
