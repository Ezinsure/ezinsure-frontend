/**
 * Livestock application domain types.
 * One application = many insured lines + optional payment/subsidy artifacts.
 */

import type { InsuranceProviderId } from '@/shared/insurance-providers';

export type LivestockSpeciesGroup = 'CATTLE' | 'POULTRY' | 'PIG';

export type LivestockOwnerMode = 'SINGLE_OWNER' | 'MULTI_OWNER';

export type PoultryProductType = 'EGG_LAYER' | 'MEAT';

/** Issued policy documents — same pattern as motor applications */
export interface LivestockIssuedDocuments {
  invoice?: string;
  insuranceCertificate?: string;
  contract?: string;
  receipt?: string;
  ebm?: string;
}

export type LivestockApplicationViewRole = 'vet' | 'admin' | 'super_admin' | 'finance';

export type InsuredLineType = 'INDIVIDUAL' | 'LOT';

export type LivestockApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PAYMENT_PROOF_REQUIRED'
  | 'PAYMENT_PROOF_SUBMITTED'
  | 'PAYMENT_VERIFIED'
  | 'SUBSIDY_DOC_REQUIRED'
  | 'SUBSIDY_SECTOR_PENDING'
  | 'SUBSIDY_SECTOR_SIGNED'
  | 'SUBSIDY_VET_SIGNED'
  | 'SUBSIDY_SONARWA_APPROVED'
  | 'PENDING_COMMISSION_REVIEW'
  | 'COMMISSION_APPROVED'
  | 'READY_TO_BE_PAID'
  | 'PAID'
  | 'INSURANCE_ISSUED'
  | 'CANCELLED'
  | 'REJECTED';

export type PaymentProofStatus = 'NOT_REQUIRED' | 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

export type SubsidyCaseStatus =
  | 'NOT_REQUIRED'
  | 'DOC_GENERATED'
  | 'SECTOR_PENDING'
  | 'SECTOR_SIGNED'
  | 'VET_SIGNED'
  | 'SONARWA_APPROVED'
  | 'REJECTED';

/** Application intake payload — header and owner details. */
export interface CreateLivestockApplicationPayload {
  speciesGroup: LivestockSpeciesGroup;
  ownerMode: LivestockOwnerMode;
  poultryProductType?: PoultryProductType;
  insuranceType: 'New' | 'Renewal' | '';
  policyStartDate: string;
  policyEndDate: string;
  owner?: {
    name: string;
    phone: string;
    nationalId?: string;
    gender?: 'male' | 'female';
    province?: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  /** Cattle applications — Girinka programme participation */
  girinka?: 'yes' | 'no';
  farmingExperience?: string;
  previousIncidents?: string;
  livestockLocation: {
    province?: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  veterinarySupport?: Record<string, string>;
  diseaseInfo?: Record<string, string>;
  bankLoan?: Record<string, string>;
  premiumTotals: ApplicationPremiumTotals;
  lines: InsuredLinePayload[];
  veterinarianVerification: {
    insuranceAgentCode?: string;
    veterinarianLicenseNumber: string;
    veterinarianSignatureName: string;
  };
}

export interface ApplicationPremiumTotals {
  premiumPercentage: number;
  premiumRateAmount: number;
  farmerContributionAmount: number;
  governmentContribution: number;
  companyCommission: number;
  veterinaryCommission: number;
  totalSumAssured: number;
}

export interface InsuredLinePayload {
  lineType: InsuredLineType;
  quantity: number;
  unitValue: number;
  sumAssured: number;
  premiumRate: number;
  farmerContribution: number;
  governmentContribution: number;
  owner?: { name: string; phone: string; nationalId?: string; gender?: 'male' | 'female' };
  animal: {
    species: string;
    animalCategory?: string;
    animalAge?: string;
    chipNumber?: string;
    breed?: string;
    color?: string;
    productivity?: string;
    hatcherySource?: string;
    poultryProductType?: PoultryProductType;
    vaccinationInfo?: string;
  };
  tekanaEligible: boolean;
}

/** Full application package for detail views. */
export interface LivestockApplicationPackage {
  _id: string;
  applicationNumber: string;
  speciesGroup: LivestockSpeciesGroup;
  ownerMode: LivestockOwnerMode;
  poultryProductType?: PoultryProductType;
  insuranceType?: string;
  insuranceProvider?: InsuranceProviderId;
  livestockLocation?: {
    province?: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  status: LivestockApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  vetId: string;
  vetName: string;
  ownerSummary: string;
  primaryOwner?: { id?: string; name: string; phone: string; nationalId?: string; gender?: 'male' | 'female' };
  ownersList?: Array<{ id?: string; name: string; phone: string; nationalId?: string; gender?: 'male' | 'female' }>;
  girinka?: 'yes' | 'no';
  ownerGender?: 'male' | 'female';
  nationalId?: string;
  farmingExperience?: string;
  previousIncidents?: string;
  hasVeterinarian?: string;
  veterinarianAvailability?: string;
  knownDiseases?: string;
  hasLoan?: string;
  financialInstitutionName?: string;
  institutionLocation?: string;
  loanAccountNumber?: string;
  loanAmount?: string;
  insuranceAgentCode?: string;
  veterinarianLicenseNumber?: string;
  veterinarianSignatureName?: string;
  applicantAddress?: {
    province?: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  lineCount: number;
  totals: ApplicationPremiumTotals;
  paymentProof: {
    status: PaymentProofStatus;
    expectedAmount: number;
    documentUrl?: string;
    transactionId?: string;
    submittedAt?: string;
    verifiedAt?: string;
  };
  subsidyCase: {
    required: boolean;
    status: SubsidyCaseStatus;
    generatedDocumentUrl?: string;
    uploadedSignedDocumentUrl?: string;
    sectorSignedAt?: string;
    vetSignedAt?: string;
    sonarwaApprovedAt?: string;
    sonarwaRejectionReason?: string;
    /** Animals list export for sector nkunganire (generated by API). */
    animalListExportUrl?: string;
  };
  lines: InsuredLinePayload[];
  policyStartDate: string;
  policyEndDate: string;
  issuedDocuments?: LivestockIssuedDocuments;
}

/** Paginated applications list response. */
export interface LivestockApplicationsListResponse {
  data: LivestockApplicationListItem[];
  meta: {
    total: number;
    startDate: string;
    endDate: string;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface LivestockApplicationListItem {
  _id: string;
  applicationNumber: string;
  insuranceProvider?: InsuranceProviderId;
  speciesGroup: LivestockSpeciesGroup;
  ownerMode: LivestockOwnerMode;
  poultryProductType?: PoultryProductType;
  insuranceType?: string;
  policyStartDate?: string;
  policyEndDate?: string;
  livestockLocation?: {
    province?: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
  };
  totalSumAssured?: number;
  governmentContribution?: number;
  veterinaryCommission?: number;
  status: LivestockApplicationStatus;
  ownerSummary: string;
  lineCount: number;
  totals: Pick<ApplicationPremiumTotals, 'farmerContributionAmount' | 'premiumRateAmount'>;
  submittedAt: string;
  paymentProofStatus: PaymentProofStatus;
  /** Cloudinary (or API) URL from root `proofOfPayment` when list row includes it. */
  paymentProofDocumentUrl?: string;
  subsidyRequired: boolean;
  paidStatus?: string;
  subsidyStatus?: string;
  vetName?: string;
}

/** Payment proof upload payload (multipart). */
export interface UploadPaymentProofPayload {
  amount: number;
  proofOfPayment: File;
  transactionId: string;
  notes?: string;
}

/** Legacy JSON shape if backend stores URL after separate upload step */
export interface UploadPaymentProofUrlPayload {
  amount: number;
  documentUrl: string;
  transactionId: string;
  notes?: string;
}

/** Generate nkunganire subsidy document response. */
export interface GenerateSubsidyDocumentResponse {
  documentUrl: string;
  templateVersion: string;
}

/** Upload signed nkunganire document (multipart). */
export interface UploadSignedSubsidyPayload {
  signedDocument: File;
  signedBy: 'SECTOR' | 'VET' | 'SONARWA';
  notes?: string;
}
