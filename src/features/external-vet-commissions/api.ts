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
import {
  mapBatch,
  mapBatchSummary,
  mapOverview,
  mapPerformanceRow,
  normalizeList,
} from './mappers';

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function pickId(raw: Record<string, unknown>): string {
  const id = raw.id ?? raw._id ?? raw.externalVetId;
  return id == null ? '' : String(id);
}

function mapExternalVet(raw: unknown): ExternalVet {
  const row = asRecord(raw);
  return {
    id: pickId(row),
    name: String(row.name ?? row.fullName ?? ''),
    phoneNumber: String(row.phoneNumber ?? ''),
    bankName:
      typeof row.bankName === 'string' && row.bankName.trim()
        ? row.bankName
        : undefined,
    bankAccountNumber:
      typeof row.bankAccountNumber === 'string' && row.bankAccountNumber.trim()
        ? row.bankAccountNumber
        : undefined,
    linkedUserId:
      typeof row.linkedUserId === 'string' ? row.linkedUserId : undefined,
    createdById: String(row.createdById ?? ''),
    createdAt: String(row.createdAt ?? ''),
    updatedAt: String(row.updatedAt ?? ''),
  };
}

function mapPlatformVet(raw: unknown): PlatformVetSearchHit {
  const row = asRecord(raw);
  return {
    userId: String(row.userId ?? row._id ?? row.id ?? ''),
    fullName: String(row.fullName ?? row.name ?? ''),
    phoneNumber:
      typeof row.phoneNumber === 'string' ? row.phoneNumber : undefined,
    bankName: typeof row.bankName === 'string' ? row.bankName : undefined,
    bankAccountNumber:
      typeof row.bankAccountNumber === 'string'
        ? row.bankAccountNumber
        : undefined,
    email: typeof row.email === 'string' ? row.email : undefined,
  };
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

function buildCreateBatchBody(input: CreateCommissionBatchInput) {
  const payee: Record<string, string> = {
    name: input.payee.name.trim(),
    phoneNumber: input.payee.phoneNumber.trim(),
  };
  if (input.payee.bankName?.trim()) {
    payee.bankName = input.payee.bankName.trim();
  }
  if (input.payee.bankAccountNumber?.trim()) {
    payee.bankAccountNumber = input.payee.bankAccountNumber.trim();
  }

  const companyCommissionPercent = Number(input.companyCommissionPercent);
  const totalCommission = input.lines.reduce(
    (sum, line) => sum + (line.companyCommission || 0),
    0,
  );

  return {
    externalVetId: String(input.externalVetId).trim(),
    payee,
    periodLabel: input.periodLabel?.trim() || undefined,
    sourceFileName: input.sourceFileName,
    companyCommissionPercent,
    totalCommission,
    lineCount: input.lines.length,
    lines: input.lines,
  };
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
    const data = unwrapData<unknown>(await readJson(response));
    const rows = Array.isArray(data) ? data : [];
    return rows.map(mapExternalVet);
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
      const data = unwrapData<unknown>(await readJson(response));
      const rows = Array.isArray(data) ? data : [];
      return rows.map(mapPlatformVet);
    },
    [apiFetch],
  );

  const createExternalVet = useCallback(
    async (input: CreateExternalVetInput): Promise<ExternalVet> => {
      const body: Record<string, string> = {
        name: input.name.trim(),
        phoneNumber: input.phoneNumber.trim(),
      };
      if (input.bankName?.trim()) body.bankName = input.bankName.trim();
      if (input.bankAccountNumber?.trim()) {
        body.bankAccountNumber = input.bankAccountNumber.trim();
      }
      if (input.linkedUserId?.trim()) {
        body.linkedUserId = input.linkedUserId.trim();
      }

      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.createExternalVet(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        throw new Error(
          await errorMessage(response, 'Failed to create external vet'),
        );
      }
      const mapped = mapExternalVet(
        unwrapData<unknown>(await readJson(response)),
      );
      if (!mapped.id) {
        throw new Error(
          'External vet was created but the API did not return an id',
        );
      }
      return mapped;
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
      return normalizeList(await readJson(response)).map(mapBatchSummary);
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
      return mapBatch(unwrapData<unknown>(await readJson(response)));
    },
    [apiFetch],
  );

  const createBatch = useCallback(
    async (
      input: CreateCommissionBatchInput,
    ): Promise<ExternalVetCommissionBatch> => {
      const body = buildCreateBatchBody(input);
      if (!body.externalVetId) {
        throw new Error('externalVetId is required');
      }

      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.createBatch(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        throw new Error(await errorMessage(response, 'Failed to create batch'));
      }
      return mapBatch(unwrapData<unknown>(await readJson(response)));
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
      return mapBatch(unwrapData<unknown>(await readJson(response)));
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
      return mapBatch(unwrapData<unknown>(await readJson(response)));
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
      return mapBatch(unwrapData<unknown>(await readJson(response)));
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
      return mapBatch(unwrapData<unknown>(await readJson(response)));
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
      return normalizeList(await readJson(response)).map(mapBatch);
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
      return normalizeList(await readJson(response)).map(mapBatch);
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
    return mapOverview(unwrapData<unknown>(await readJson(response)));
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
    return normalizeList(await readJson(response)).map(mapPerformanceRow);
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
