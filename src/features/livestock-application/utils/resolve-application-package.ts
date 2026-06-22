import { mapToLivestockApplicationPackage } from '@/features/livestock-application/api/mappers';
import { getCachedLivestockApplicationRow } from '@/features/livestock-application/api/livestock-application-session-cache';
import type {
  LivestockApplicationListItem,
  LivestockApplicationPackage,
} from '@/features/livestock-application/domain/application-types';

export function resolveApplicationPackageFromListItem(
  item: LivestockApplicationListItem,
): LivestockApplicationPackage | null {
  const raw = getCachedLivestockApplicationRow(item._id);
  if (!raw) return null;
  return mapToLivestockApplicationPackage(raw);
}

export function resolveApplicationPackageById(
  applicationId: string,
): LivestockApplicationPackage | null {
  const raw = getCachedLivestockApplicationRow(applicationId);
  if (!raw) return null;
  return mapToLivestockApplicationPackage(raw);
}
