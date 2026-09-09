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
  ExternalVetCommissionLinesResult,
  ExternalVetCommissionStatus,
  ExternalVetPerformanceRow,
  ExternalVetsOverviewStats,
  MarkAwaitingSonarwaReimbursementInput,
  MarkReimbursedBySonarwaInput,
  PlatformVetSearchHit,
} from './domain';
import {
  EXTERNAL_VET_LINES_WORKSPACE_STATUSES,
  summarizeCommissionLines,
} from './domain';
import {
  linesFromBatch,
  mapBatch,
  mapBatchSummary,
  mapLinesResult,
  mapOverview,
  mapPerformanceRow,
  normalizeList,
} from './mappers';
import { batchCreatedInDateRange } from './export/batch-list-export';

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
    district:
      typeof row.district === 'string' && row.district.trim()
        ? row.district
        : undefined,
    sector:
      typeof row.sector === 'string' && row.sector.trim()
        ? row.sector
        : undefined,
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

function buildCreateBatchFormData(input: CreateCommissionBatchInput): FormData {
  const payee: Record<string, string> = {
    name: input.payee.name.trim(),
    phoneNumber: input.payee.phoneNumber.trim(),
    district: input.payee.district.trim(),
    sector: input.payee.sector.trim(),
    commissionRequestDate: input.payee.commissionRequestDate.trim(),
  };
  if (input.payee.bankName?.trim()) {
    payee.bankName = input.payee.bankName.trim();
  }
  if (input.payee.bankAccountNumber?.trim()) {
    payee.bankAccountNumber = input.payee.bankAccountNumber.trim();
  }

  const companyCommissionPercent = Number(input.companyCommissionPercent);
  const totalVetCommission = input.lines.reduce(
    (sum, line) => sum + (line.vetCommission || 0),
    0,
  );
  const totalCompanyCommission = input.lines.reduce(
    (sum, line) => sum + (line.companyCommission || 0),
    0,
  );

  const lines = input.lines.map((line) => ({
    microchipNumber: line.microchipNumber,
    prodDate: line.prodDate,
    branch: line.branch,
    effecDate: line.effecDate,
    expiryDate: line.expiryDate,
    contract: line.contract,
    typeLivestock: line.typeLivestock,
    clientId: line.clientId,
    clientName: line.clientName,
    clientDistrict: line.clientDistrict,
    clientSector: line.clientSector,
    sumInsured: line.sumInsured,
    netPremium: line.netPremium,
    vetCommission: line.vetCommission,
    companyCommission: line.companyCommission,
  }));

  // Same pattern as motor/livestock apply: multipart FormData + file field.
  const formData = new FormData();
  formData.append('externalVetId', String(input.externalVetId).trim());
  formData.append('payee', JSON.stringify(payee));
  formData.append('periodLabel', input.periodLabel.trim());
  formData.append('sourceFileName', input.sourceFileName);
  formData.append('companyCommissionPercent', String(companyCommissionPercent));
  formData.append('totalVetCommission', String(totalVetCommission));
  formData.append('totalCompanyCommission', String(totalCompanyCommission));
  formData.append('lineCount', String(input.lines.length));
  formData.append('lines', JSON.stringify(lines));
  formData.append(
    'sourceDocument',
    input.sourceFile,
    input.sourceFile.name || input.sourceFileName || 'commission-claim.xlsx',
  );

  return formData;
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
      if (input.district?.trim()) body.district = input.district.trim();
      if (input.sector?.trim()) body.sector = input.sector.trim();
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
      range?: { startDate?: string; endDate?: string },
    ): Promise<ExternalVetCommissionBatchSummary[]> => {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.listBatches({
          status,
          startDate: range?.startDate,
          endDate: range?.endDate,
        }),
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
      const formData = buildCreateBatchFormData(input);
      if (!String(input.externalVetId).trim()) {
        throw new Error('externalVetId is required');
      }
      if (!input.sourceFile) {
        throw new Error('The original claim form file is required');
      }

      // Do not set Content-Type — the browser sets multipart boundary.
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.createBatch(),
        {
          method: 'POST',
          body: formData,
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

  /**
   * Prefer GET /lines. If unavailable (404), expand matching reimbursement
   * batches so the Lines workspace still works during backend rollout.
   */
  const listLines = useCallback(
    async (params?: {
      status?: ExternalVetCommissionStatus | 'ALL';
      startDate?: string;
      endDate?: string;
      externalVetId?: string;
    }): Promise<ExternalVetCommissionLinesResult> => {
      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.listLines({
          status: params?.status,
          startDate: params?.startDate,
          endDate: params?.endDate,
          externalVetId: params?.externalVetId,
        }),
      );

      if (response.ok) {
        return mapLinesResult(await readJson(response));
      }

      if (response.status !== 404) {
        throw new Error(await errorMessage(response, 'Failed to list lines'));
      }

      const statuses: Array<ExternalVetCommissionStatus | 'ALL'> =
        params?.status && params.status !== 'ALL'
          ? [params.status]
          : [...EXTERNAL_VET_LINES_WORKSPACE_STATUSES];

      const batchLists = await Promise.all(
        statuses.map((status) =>
          listBatches(status, {
            startDate: params?.startDate,
            endDate: params?.endDate,
          }),
        ),
      );

      const byId = new Map<string, ExternalVetCommissionBatchSummary>();
      for (const list of batchLists) {
        for (const batch of list) {
          if (
            params?.externalVetId &&
            batch.externalVetId !== params.externalVetId
          ) {
            continue;
          }
          if (
            !batchCreatedInDateRange(
              batch.createdAt,
              params?.startDate,
              params?.endDate,
            )
          ) {
            continue;
          }
          byId.set(batch.id, batch);
        }
      }

      const details = await Promise.all(
        [...byId.keys()].map(async (id) => {
          try {
            return await getBatch(id);
          } catch {
            return null;
          }
        }),
      );

      const lines = details
        .filter((batch): batch is ExternalVetCommissionBatch => batch != null)
        .flatMap(linesFromBatch);

      return {
        lines,
        summary: summarizeCommissionLines(lines),
      };
    },
    [apiFetch, getBatch, listBatches],
  );

  const markAwaitingSonarwaReimbursement = useCallback(
    async (
      input: MarkAwaitingSonarwaReimbursementInput,
    ): Promise<ExternalVetCommissionBatch[]> => {
      const body: Record<string, unknown> = {
        batchIds: input.batchIds,
        ids: input.batchIds,
      };
      if (input.exportReference?.trim()) {
        body.exportReference = input.exportReference.trim();
      }

      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.markAwaitingSonarwaReimbursement(),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        throw new Error(
          await errorMessage(
            response,
            'Failed to mark awaiting SONARWA reimbursement',
          ),
        );
      }
      return normalizeList(await readJson(response)).map(mapBatch);
    },
    [apiFetch],
  );

  const markReimbursedBySonarwa = useCallback(
    async (
      input: MarkReimbursedBySonarwaInput,
    ): Promise<ExternalVetCommissionBatch[]> => {
      const body: Record<string, unknown> = {
        batchIds: input.batchIds,
        ids: input.batchIds,
      };
      if (input.reimbursedAt?.trim()) {
        body.reimbursedAt = input.reimbursedAt.trim();
      }
      if (input.reimbursementReference?.trim()) {
        body.reimbursementReference = input.reimbursementReference.trim();
      }

      const response = await apiFetch(
        EXTERNAL_VET_COMMISSION_ENDPOINTS.markReimbursedBySonarwa(),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        throw new Error(
          await errorMessage(
            response,
            'Failed to mark reimbursed by SONARWA',
          ),
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
      listLines,
      markAwaitingSonarwaReimbursement,
      markReimbursedBySonarwa,
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
      listLines,
      markAwaitingSonarwaReimbursement,
      markReimbursedBySonarwa,
      getOverview,
      getPerformance,
    ],
  );
}
