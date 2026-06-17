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
  mapApplicationsListResponse,
  mapToLivestockApplicationPackage,
  parseCreateApplicationResponse,
  toNewApplicationBody,
} from '@/features/livestock-application/api/mappers';
import { extractApplicationsRawRows } from '@/features/livestock-application/api/mappers/list.mapper';

export type LivestockDataSource = 'backend' | 'mock';

const MOCK_ID_PREFIX = 'mock-app-';

export function isMockApplicationId(id: string): boolean {
  return id.startsWith(MOCK_ID_PREFIX);
}

export interface ListApplicationsQuery {
  agentId: string;
  startDate: string;
  endDate: string;
}

export interface GetApplicationQuery {
  applicationId: string;
  agentId?: string;
}

/**
 * Repository interface — UI hooks depend on this, not raw fetch paths.
 * Swap `dataSource` to move admin views from mock → backend without touching components.
 */
export interface LivestockApplicationsRepository {
  readonly dataSource: LivestockDataSource;
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
  agentId: string,
): Promise<unknown | null> {
  const today = new Date().toISOString().slice(0, 10);
  const payload = await requestJson<VeterinaryApplicationsListPayload>(
    apiFetch,
    LIVESTOCK_VET_ENDPOINTS.listApplications({
      agentId,
      startDate: LIST_FALLBACK_START_DATE,
      endDate: today,
    }),
    { method: 'GET' },
  );

  const row = extractApplicationsRawRows(payload).find((item) => {
    if (!item || typeof item !== 'object') return false;
    return (item as { _id?: string })._id === applicationId;
  });

  return row ?? null;
}

function createBackendRepository(apiFetch: ApiFetch): LivestockApplicationsRepository {
  return {
    dataSource: 'backend',

    async list({ agentId, startDate, endDate }) {
      const payload = await requestJson<VeterinaryApplicationsListPayload>(
        apiFetch,
        LIVESTOCK_VET_ENDPOINTS.listApplications({ agentId, startDate, endDate }),
        { method: 'GET' },
      );

      const data = mapApplicationsListResponse(payload);
      return {
        data,
        meta: { total: data.length, startDate, endDate },
      };
    },

    async getById({ applicationId, agentId }) {
      let raw = await tryFetchApplicationRecord(apiFetch, applicationId);

      if (!raw && agentId) {
        raw = await findApplicationInList(apiFetch, applicationId, agentId);
      }

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

function createMockRepository(): LivestockApplicationsRepository {
  return {
    dataSource: 'mock',

    async list({ startDate, endDate }) {
      return fetchLivestockApplicationsMock(startDate, endDate);
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
): LivestockApplicationsRepository {
  return dataSource === 'backend'
    ? createBackendRepository(apiFetch)
    : createMockRepository();
}

/** Vet portal uses the real backend; admin demo views use mock until list API is wired. */
export function resolveLivestockDataSource(vetAgentId?: string): LivestockDataSource {
  return vetAgentId ? 'backend' : 'mock';
}

export function createLivestockRepositoryForVet(
  apiFetch: ApiFetch,
  vetAgentId?: string,
): LivestockApplicationsRepository {
  return createLivestockApplicationsRepository(apiFetch, resolveLivestockDataSource(vetAgentId));
}

export type { ApiFetch } from '@/features/livestock-application/api/http';
