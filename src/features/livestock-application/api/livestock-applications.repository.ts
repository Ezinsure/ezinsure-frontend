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
import {
  fetchLivestockApplicationByIdMock,
  fetchLivestockApplicationsMock,
} from '@/features/livestock-application/api/applications-api';
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

export type LivestockDataSource = 'backend' | 'mock';
export type LivestockListScope = 'vet' | 'all';

const MOCK_ID_PREFIX = 'mock-app-';

export function isMockApplicationId(id: string): boolean {
  return id.startsWith(MOCK_ID_PREFIX);
}

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

/**
 * Repository interface — UI hooks depend on this, not raw fetch paths.
 */
export interface LivestockApplicationsRepository {
  readonly dataSource: LivestockDataSource;
  readonly listScope: LivestockListScope;
  list(query: ListApplicationsQuery): Promise<LivestockApplicationsListResponse>;
  getById(query: GetApplicationQuery): Promise<LivestockApplicationPackage | null>;
  create(payload: CreateLivestockApplicationPayload): Promise<CreateApplicationResult>;
}

async function tryFetchApplicationRecord(
  apiFetch: ApiFetch,
  applicationId: string,
): Promise<unknown | null> {
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
    dataSource: 'backend',
    listScope,

    async list({ agentId, startDate, endDate, pageNumber = 1, pageSize = LIVESTOCK_LIST_DEFAULT_PAGE_SIZE, scope = listScope }) {
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

function createMockRepository(listScope: LivestockListScope): LivestockApplicationsRepository {
  return {
    dataSource: 'mock',
    listScope,

    async list({ startDate, endDate, pageNumber = 1, pageSize = LIVESTOCK_LIST_DEFAULT_PAGE_SIZE }) {
      const all = await fetchLivestockApplicationsMock(startDate, endDate);
      const start = (pageNumber - 1) * pageSize;
      const data = all.data.slice(start, start + pageSize);
      const total = all.meta.total;
      return {
        data,
        meta: {
          total,
          startDate,
          endDate,
          pageNumber,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      };
    },

    async getById({ applicationId }) {
      if (!isMockApplicationId(applicationId)) return null;
      return fetchLivestockApplicationByIdMock(applicationId);
    },

    async create() {
      throw new Error('Create application is only available for veterinary agents.');
    },
  };
}

export function createLivestockApplicationsRepository(
  apiFetch: ApiFetch,
  dataSource: LivestockDataSource,
  listScope: LivestockListScope = 'vet',
): LivestockApplicationsRepository {
  return dataSource === 'backend'
    ? createBackendRepository(apiFetch, listScope)
    : createMockRepository(listScope);
}

export function resolveLivestockDataSource(
  listScope: LivestockListScope,
  vetAgentId?: string,
): LivestockDataSource {
  if (listScope === 'all') return 'backend';
  return vetAgentId ? 'backend' : 'mock';
}

export function createLivestockApplicationsRepositoryForScope(
  apiFetch: ApiFetch,
  listScope: LivestockListScope,
  vetAgentId?: string,
): LivestockApplicationsRepository {
  return createLivestockApplicationsRepository(
    apiFetch,
    resolveLivestockDataSource(listScope, vetAgentId),
    listScope,
  );
}

/** @deprecated Use createLivestockApplicationsRepositoryForScope */
export function createLivestockRepositoryForVet(
  apiFetch: ApiFetch,
  vetAgentId?: string,
): LivestockApplicationsRepository {
  return createLivestockApplicationsRepositoryForScope(apiFetch, 'vet', vetAgentId);
}

export type { ApiFetch } from '@/features/livestock-application/api/http';
