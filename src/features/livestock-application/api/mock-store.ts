import type {
  LivestockApplicationListItem,
  LivestockApplicationPackage,
} from '@/features/livestock-application/domain/application-types';
import {
  MOCK_LIVESTOCK_APPLICATIONS,
  MOCK_LIVESTOCK_APPLICATION_DETAILS,
} from '@/features/livestock-application/api/mock-data';

/** In-memory mock store so uploads persist during dev session */
let listItems: LivestockApplicationListItem[] = MOCK_LIVESTOCK_APPLICATIONS.map((item) => ({
  ...item,
}));
const details: Record<string, LivestockApplicationPackage> = Object.fromEntries(
  Object.entries(MOCK_LIVESTOCK_APPLICATION_DETAILS).map(([id, pkg]) => [id, { ...pkg }]),
);

export function getMockApplicationsList(): LivestockApplicationListItem[] {
  return listItems;
}

export function getMockApplicationDetail(id: string): LivestockApplicationPackage | null {
  const pkg = details[id];
  return pkg ? { ...pkg } : null;
}

export function updateMockApplication(
  id: string,
  patch: Partial<LivestockApplicationPackage>,
): LivestockApplicationPackage | null {
  const current = details[id];
  if (!current) return null;
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  details[id] = updated;
  const listIdx = listItems.findIndex((item) => item._id === id);
  if (listIdx !== -1) {
    listItems[listIdx] = {
      ...listItems[listIdx],
      status: updated.status,
      paymentProofStatus: updated.paymentProof.status,
      totals: {
        farmerContributionAmount: updated.totals.farmerContributionAmount,
        premiumRateAmount: updated.totals.premiumRateAmount,
      },
    };
  }
  return updated;
}

export function registerMockApplication(
  listItem: LivestockApplicationListItem,
  pkg: LivestockApplicationPackage,
): void {
  listItems = [listItem, ...listItems];
  details[pkg._id] = pkg;
}
