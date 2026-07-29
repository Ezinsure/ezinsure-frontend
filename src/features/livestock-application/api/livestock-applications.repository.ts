import type { CreateLivestockApplicationPayload } from '@/features/livestock-application/domain/application-types';
import type {
  LivestockApplicationPackage,
  LivestockApplicationsListResponse,
} from '@/features/livestock-application/domain/application-types';
import type {
  CreateApplicationResult,
  VeterinaryApplicationsListPayload,
} from '@/features/livestock-application/api/backend-types';
import {
  LIST_FALLBACK_START_DATE,
  LIST_FALLBACK_PAGE_SIZE,
  LIVESTOCK_ADMIN_ENDPOINTS,
  LIVESTOCK_LIST_DEFAULT_PAGE_SIZE,
  LIVESTOCK_VET_ENDPOINTS,
} from '@/features/livestock-application/api/endpoints';
import {
  type ApiFetch,
  parseJsonSafe,
  requestJson,
  unwrapEntityPayload,
} from '@/features/livestock-application/api/http';
import { isLivestockWorkflowApiLive } from '@/features/livestock-application/utils/workflow-demo-mode';
import {
  extractApplicationsListPaginationMeta,
  mapApplicationsListResponse,
  mapToLivestockApplicationPackage,
  parseCreateApplicationResponse,
  toNewApplicationBody,
} from '@/features/livestock-application/api/mappers';
import { extractApplicationsRawRows } from '@/features/livestock-application/api/mappers/list.mapper';
import {
  cacheLivestockApplicationRows,
  getCachedLivestockApplicationRow,
} from '@/features/livestock-application/api/livestock-application-session-cache';

export type LivestockListScope = 'vet' | 'all';

export interface ListApplicationsQuery {
  agentId?: string;
  startDate: string;
  endDate: string;
  pageNumber?: number;
  pageSize?: number;
  scope?: LivestockListScope;
}

export interface GetApplicationQuery {
  applicationId: string;
  agentId?: string;
  scope?: LivestockListScope;
}

export interface LivestockApplicationsRepository {
  readonly listScope: LivestockListScope;
  list(query: ListApplicationsQuery): Promise<LivestockApplicationsListResponse>;
  getById(query: GetApplicationQuery): Promise<LivestockApplicationPackage | null>;
  create(payload: CreateLivestockApplicationPayload): Promise<CreateApplicationResult>;
}

async function tryFetchApplicationRecord(
  apiFetch: ApiFetch,
  applicationId: string,
): Promise<unknown | null> {
  if (isLivestockWorkflowApiLive('applicationDetail')) {
    try {
      const response = await requestJson<unknown>(
        apiFetch,
        LIVESTOCK_VET_ENDPOINTS.getVeterinaryApplicationById(applicationId),
        { method: 'GET' },
        'application-detail',
      );
      const data = unwrapEntityPayload(response);
      if (data && typeof data === 'object') return data;
    } catch {
      /* fall through to legacy paths */
    }
  }

  const paths = [
    LIVESTOCK_VET_ENDPOINTS.getApplicationById(applicationId),
    LIVESTOCK_VET_ENDPOINTS.getApplicationByQuery(applicationId),
    LIVESTOCK_VET_ENDPOINTS.getApplicationByIdParam(applicationId),
  ];

  for (const path of paths) {
    const response = await apiFetch(path, { method: 'GET' });
    if (response.status === 404) continue;

    const payload = await parseJsonSafe(response);
    if (!response.ok) continue;

    const data = unwrapEntityPayload(payload);
    if (data && typeof data === 'object') return data;
  }

  return null;
}

async function findApplicationInList(
  apiFetch: ApiFetch,
  applicationId: string,
  options?: { agentId?: string; scope?: LivestockListScope },
): Promise<unknown | null> {
  const today = new Date().toISOString().slice(0, 10);
  const listParams = {
    startDate: LIST_FALLBACK_START_DATE,
    endDate: today,
    pageNumber: 1,
    pageSize: LIST_FALLBACK_PAGE_SIZE,
  };

  const path =
    options?.scope === 'all'
      ? LIVESTOCK_ADMIN_ENDPOINTS.listAllApplications(listParams)
      : LIVESTOCK_VET_ENDPOINTS.listApplications({
          ...listParams,
          agentId: options?.agentId ?? '',
        });

  const payload = await requestJson<VeterinaryApplicationsListPayload>(apiFetch, path, {
    method: 'GET',
  });

  return findRowById(payload, applicationId);
}

function findRowById(payload: unknown, applicationId: string): unknown | null {
  const row = extractApplicationsRawRows(payload).find((item) => {
    if (!item || typeof item !== 'object') return false;
    return (item as { _id?: string })._id === applicationId;
  });

  return row ?? null;
}

function createBackendRepository(
  apiFetch: ApiFetch,
  listScope: LivestockListScope,
): LivestockApplicationsRepository {
  return {
    listScope,

    async list({
      agentId,
      startDate,
      endDate,
      pageNumber = 1,
      pageSize = LIVESTOCK_LIST_DEFAULT_PAGE_SIZE,
      scope = listScope,
    }) {
      const path =
        scope === 'all'
          ? LIVESTOCK_ADMIN_ENDPOINTS.listAllApplications({
              startDate,
              endDate,
              pageNumber,
              pageSize,
            })
          : LIVESTOCK_VET_ENDPOINTS.listApplications({
              agentId: agentId ?? '',
              startDate,
              endDate,
              pageNumber,
              pageSize,
            });

      const payload = await requestJson<VeterinaryApplicationsListPayload>(apiFetch, path, {
        method: 'GET',
      });

      const rawRows = extractApplicationsRawRows(payload);
      cacheLivestockApplicationRows(rawRows);

      const data = mapApplicationsListResponse(payload);
      const pagination = extractApplicationsListPaginationMeta(payload, {
        pageNumber,
        pageSize,
        dataLength: data.length,
      });

      return {
        data,
        meta: {
          total: pagination.total,
          startDate,
          endDate,
          pageNumber: pagination.pageNumber,
          pageSize: pagination.pageSize,
          totalPages: pagination.totalPages,
        },
      };
    },

    async getById({ applicationId, agentId, scope = listScope }) {
      if (isLivestockWorkflowApiLive('applicationDetail')) {
        const raw = await tryFetchApplicationRecord(apiFetch, applicationId);
        if (raw) {
          cacheLivestockApplicationRows([raw]);
          return mapToLivestockApplicationPackage(raw);
        }
      }

      const cached = getCachedLivestockApplicationRow(applicationId);
      if (cached) {
        return mapToLivestockApplicationPackage(cached);
      }

      if (scope === 'all') {
        const raw = await findApplicationInList(apiFetch, applicationId, { scope: 'all' });
        if (!raw) return null;
        cacheLivestockApplicationRows([raw]);
        return mapToLivestockApplicationPackage(raw);
      }

      if (agentId) {
        const raw = await findApplicationInList(apiFetch, applicationId, { agentId, scope: 'vet' });
        if (!raw) return null;
        cacheLivestockApplicationRows([raw]);
        return mapToLivestockApplicationPackage(raw);
      }

      const raw = await tryFetchApplicationRecord(apiFetch, applicationId);
      if (!raw) return null;
      return mapToLivestockApplicationPackage(raw);
    },

    async create(payload) {
      const result = await requestJson<unknown>(
        apiFetch,
        LIVESTOCK_VET_ENDPOINTS.createApplication(),
        {
          method: 'POST',
          body: JSON.stringify(toNewApplicationBody(payload)),
        },
      );
      return parseCreateApplicationResponse(result);
    },
  };
}

export function createLivestockApplicationsRepositoryForScope(
  apiFetch: ApiFetch,
  listScope: LivestockListScope,
): LivestockApplicationsRepository {
  return createBackendRepository(apiFetch, listScope);
}

/** @deprecated Use createLivestockApplicationsRepositoryForScope */
export function createLivestockRepositoryForVet(
  apiFetch: ApiFetch,
): LivestockApplicationsRepository {
  return createLivestockApplicationsRepositoryForScope(apiFetch, 'vet');
}

export type { ApiFetch } from '@/features/livestock-application/api/http';
