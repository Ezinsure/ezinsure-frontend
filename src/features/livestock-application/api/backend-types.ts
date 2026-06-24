/**
 * Wire-format types for the livestock API layer.
 * UI domain types live in domain/application-types.ts; map via api/mappers/.
 */

import type {
  LivestockOwnerMode,
  LivestockSpeciesGroup,
} from '@/features/livestock-application/domain/application-types';

/** New application request body (API wire format). */
export interface NewLivestockApplicationBody {
  speciesGroup: LivestockSpeciesGroup;
  ownerMode: LivestockOwnerMode;
  poultryProductType?: string;
  insuranceType?: 'New' | 'Renewal';
  policyStartDate: string;
  policyEndDate: string;
  owner?: {
    name: string;
    phone: string;
    nationalId?: string;
    gender?: 'male' | 'female';
    district: string;
    sector: string;
    cell: string;
    village: string;
    province?: string;
  };
  girinka?: 'yes' | 'no';
  livestockLocation: {
    district: string;
    sector: string;
    cell: string;
    village: string;
    province?: string;
  };
  premiumTotals: {
    premiumRateAmount: number;
    farmerContributionAmount: number;
    governmentContribution: number;
    companyCommission: number;
    veterinaryCommission: number;
  };
  lines: Array<{
    lineType: 'INDIVIDUAL' | 'LOT';
    quantity: number;
    unitValue: number;
    sumAssured: number;
    tekanaEligible: boolean;
    owner?: { name: string; phone: string; nationalId?: string; gender?: 'male' | 'female' };
    animal: Record<string, string>;
  }>;
}

/** One insured line as stored by the backend (flat or nested animal). */
export interface VeterinaryApplicationLineRecord {
  _id?: string;
  lineType?: 'INDIVIDUAL' | 'LOT';
  quantity?: number;
  unitValue?: number;
  sumAssured?: number;
  premiumRate?: number;
  farmerContribution?: number;
  governmentContribution?: number;
  tekanaEligible?: boolean;
  species?: string;
  chipNumber?: string;
  hatcherySource?: string;
  ownerName?: string;
  ownerPhone?: string;
  owner?: { name?: string; phone?: string };
  animal?: Record<string, string>;
}

/** GET /getVeterinaryApplications row & GET /getVeterinaryApplication/:id document */
export interface VeterinaryApplicationRecord {
  _id: string;
  applicationNumber: string;
  insuranceType?: string;
  speciesGroup: LivestockSpeciesGroup;
  poultryProductType?: string;
  ownerMode?: LivestockOwnerMode;
  lines?: VeterinaryApplicationLineRecord[];
  farmerContributionAmount?: number;
  premiumRateAmount?: number;
  governmentContribution?: number;
  companyCommission?: number;
  veterinaryCommission?: number;
  policyStartDate?: string;
  policyEndDate?: string;
  ownerName?: string;
  ownerPhone?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  livestockDistrict?: string;
  livestockSector?: string;
  livestockCell?: string;
  livestockVillage?: string;
  livestockProvince?: string;
  totalSumAssured?: number;
  primaryOwnerId?: string | null;
  status?: string;
  subsidyStatus?: string;
  paidStatus?: string;
  agentCommissionPaymentStatus?: string;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  agent?: { _id?: string; fullName?: string; phoneNumber?: string };
  insuranceProvider?: string;
}

export interface VeterinaryApplicationsListPayload {
  data?: VeterinaryApplicationRecord[];
  total?: number;
  totalCount?: number;
  count?: number;
  pageNumber?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface CreateApplicationResult {
  _id: string;
  applicationNumber: string;
  status: string;
  submittedAt?: string;
}
