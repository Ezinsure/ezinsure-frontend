/**
 * @deprecated Prefer `createLivestockApplicationsRepository` from livestock-applications.repository.ts.
 * Thin compatibility layer kept for existing imports.
 */
import type { CreateLivestockApplicationPayload } from '@/features/livestock-application/domain/application-types';
import type {
  LivestockApplicationPackage,
  LivestockApplicationsListResponse,
} from '@/features/livestock-application/domain/application-types';
import type { CreateApplicationResult } from '@/features/livestock-application/api/backend-types';
import type { ApiFetch } from '@/features/livestock-application/api/http';
import { createLivestockApplicationsRepository } from '@/features/livestock-application/api/livestock-applications.repository';

export type { ApiFetch } from '@/features/livestock-application/api/http';

/** GET /getVeterinaryApplications?agentId=&startDate=&endDate= */
export async function fetchVetLivestockApplications(
  apiFetch: ApiFetch,
  params: { agentId: string; startDate: string; endDate: string },
): Promise<LivestockApplicationsListResponse> {
  const repo = createLivestockApplicationsRepository(apiFetch, 'backend');
  return repo.list(params);
}

/** POST /newApplication */
export async function createNewLivestockApplication(
  apiFetch: ApiFetch,
  payload: CreateLivestockApplicationPayload,
): Promise<CreateApplicationResult> {
  const repo = createLivestockApplicationsRepository(apiFetch, 'backend');
  return repo.create(payload);
}

/**
 * Load one application for the detail page.
 * Tries GET /getVeterinaryApplication/:id, then falls back to scanning the vet list.
 */
export async function fetchVetLivestockApplicationById(
  apiFetch: ApiFetch,
  params: { applicationId: string; agentId?: string },
): Promise<LivestockApplicationPackage | null> {
  const repo = createLivestockApplicationsRepository(apiFetch, 'backend');
  return repo.getById(params);
}
