import { mapToLivestockApplicationPackage } from '@/features/livestock-application/api/mappers';
import { getCachedLivestockApplicationRow } from '@/features/livestock-application/api/livestock-application-session-cache';
import { applyWorkflowPatch } from '@/features/livestock-application/api/workflow-session';
import type {
  LivestockApplicationListItem,
  LivestockApplicationPackage,
} from '@/features/livestock-application/domain/application-types';
import { resolveSubsidyEligibility } from '@/features/livestock-application/utils/subsidy-eligibility';

function enrichApplicationPackage(
  pkg: LivestockApplicationPackage,
): LivestockApplicationPackage {
  const patched = applyWorkflowPatch(pkg);
  const eligibility = resolveSubsidyEligibility(patched);
  return {
    ...patched,
    subsidyCase: {
      ...patched.subsidyCase,
      required: eligibility.required,
    },
  };
}

export function resolveApplicationPackageFromListItem(
  item: LivestockApplicationListItem,
): LivestockApplicationPackage | null {
  const raw = getCachedLivestockApplicationRow(item._id);
  if (!raw) return null;
  const pkg = mapToLivestockApplicationPackage(raw);
  if (!pkg) return null;
  return enrichApplicationPackage(pkg);
}

export function resolveApplicationPackageById(
  applicationId: string,
): LivestockApplicationPackage | null {
  const raw = getCachedLivestockApplicationRow(applicationId);
  if (!raw) return null;
  const pkg = mapToLivestockApplicationPackage(raw);
  if (!pkg) return null;
  return enrichApplicationPackage(pkg);
}
