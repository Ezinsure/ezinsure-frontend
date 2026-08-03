import type {
  LivestockApplicationListItem,
  LivestockApplicationStatus,
  LivestockOwnerMode,
  LivestockSpeciesGroup,
} from '@/features/livestock-application/domain/application-types';
import { APPLICATION_STATUS_LABELS } from '@/features/livestock-application/domain/application-status';

export type SpeciesFilter = LivestockSpeciesGroup | 'ALL';
export type StatusFilter = LivestockApplicationStatus | 'ALL';
export type OwnerModeFilter = LivestockOwnerMode | 'ALL';
export type PaymentFilter = 'ALL' | 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'NOT_REQUIRED';

export interface ApplicationsListFilters {
  search: string;
  speciesGroup: SpeciesFilter;
  status: StatusFilter;
  ownerMode: OwnerModeFilter;
  paymentStatus: PaymentFilter;
}

export const DEFAULT_APPLICATIONS_LIST_FILTERS: ApplicationsListFilters = {
  search: '',
  speciesGroup: 'ALL',
  status: 'ALL',
  ownerMode: 'ALL',
  paymentStatus: 'ALL',
};

export function getDefaultApplicationsListFilters(): ApplicationsListFilters {
  return { ...DEFAULT_APPLICATIONS_LIST_FILTERS };
}

/** Statuses most useful in day-to-day list filtering. */
export const LIST_STATUS_FILTER_OPTIONS: LivestockApplicationStatus[] = [
  'SUBMITTED',
  'PAYMENT_PROOF_REQUIRED',
  'PAYMENT_PROOF_SUBMITTED',
  'PAYMENT_VERIFIED',
  'SUBSIDY_DOC_REQUIRED',
  'SUBSIDY_SECTOR_PENDING',
  'SUBSIDY_SECTOR_SIGNED',
  'SUBSIDY_VET_SIGNED',
  'SUBSIDY_SONARWA_APPROVED',
  'INSURANCE_ISSUED',
  'PENDING_ADMIN_REVIEW',
  'READY_TO_BE_PAID',
  'PAID',
  'CANCELLED',
  'REJECTED',
];

export const PAYMENT_FILTER_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: 'ALL', label: 'All payments' },
  { value: 'PENDING', label: 'Payment pending' },
  { value: 'SUBMITTED', label: 'Proof submitted' },
  { value: 'VERIFIED', label: 'Payment verified' },
  { value: 'NOT_REQUIRED', label: 'Not required' },
];

export function hasActiveListFilters(filters: ApplicationsListFilters): boolean {
  const defaults = getDefaultApplicationsListFilters();
  return (
    filters.search.trim().length > 0 ||
    filters.speciesGroup !== defaults.speciesGroup ||
    filters.status !== defaults.status ||
    filters.ownerMode !== defaults.ownerMode ||
    filters.paymentStatus !== defaults.paymentStatus
  );
}

function normalizePaymentValue(app: LivestockApplicationListItem): string {
  if (app.paymentProofDocumentUrl?.trim()) return 'SUBMITTED';
  if (app.status === 'PAYMENT_PROOF_SUBMITTED') return 'SUBMITTED';
  return String(app.paymentProofStatus ?? app.paidStatus ?? '').toUpperCase();
}

function buildSearchHaystack(app: LivestockApplicationListItem): string {
  const location = app.livestockLocation;
  return [
    app.applicationNumber,
    app.ownerSummary,
    app.vetName,
    app.insuranceProvider,
    app.insuranceType,
    app.speciesGroup,
    app.ownerMode,
    app.paidStatus,
    app.subsidyStatus,
    app.status,
    location?.district,
    location?.sector,
    location?.province,
    location?.village,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function applyApplicationsListFilters(
  items: LivestockApplicationListItem[],
  filters: ApplicationsListFilters,
): LivestockApplicationListItem[] {
  const query = filters.search.trim().toLowerCase();

  return items.filter((app) => {
    if (filters.speciesGroup !== 'ALL' && app.speciesGroup !== filters.speciesGroup) {
      return false;
    }
    if (filters.status !== 'ALL' && app.status !== filters.status) {
      return false;
    }
    if (filters.ownerMode !== 'ALL' && app.ownerMode !== filters.ownerMode) {
      return false;
    }
    if (filters.paymentStatus !== 'ALL') {
      const payment = normalizePaymentValue(app);
      if (payment !== filters.paymentStatus) return false;
    }
    if (query && !buildSearchHaystack(app).includes(query)) {
      return false;
    }
    return true;
  });
}

export function statusFilterLabel(status: LivestockApplicationStatus): string {
  return APPLICATION_STATUS_LABELS[status] ?? status;
}

export function formatInsuredLineCount(count: number): string {
  if (count === 0) return 'No lines loaded';
  if (count === 1) return '1 insured line';
  return `${count} insured lines`;
}
