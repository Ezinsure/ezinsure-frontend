import type { SearchableSelectOption } from '@/components/ui/searchable-select';
import { ApplicationStatus } from '@/features/admin-motor-applications/types';

export { ApplicationStatus };

export interface AgentEmailRecord extends SearchableSelectOption {
  email: string;
}

export interface MassApplicationsUploadResponse {
  message: string;
  created: number;
  skipped: number;
  errors: unknown[];
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  timezone: string;
  deviceMemory?: number;
  devicePixelRatio: number;
  viewportSize: string;
  browserName: string;
  browserVersion: string;
  operatingSystem: string;
}

export interface LocationInfo {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp?: number;
  error?: string;
  ipLocation?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
}

export interface TrackingData {
  deviceInfo: DeviceInfo;
  locationInfo: LocationInfo;
  sessionId: string;
  timestamp: number;
}

export interface ApplicationFormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
  province: string;
  district: string;
  sector: string;
  identificationDocumentType: string;
  identificationNumber: string;
  insuranceCategory: string;
  insuranceType: string;
  insuranceDuration: string;
  insuranceProvider: string;
  isCOMESA: boolean;
  plateNumber: string;
  chasisNumber: string;
  vehicleType: string;
  vehicleAge: string;
  vehicleUse: string;
  otherVehicleUse: string;
  nationalID: File | null;
  yellowCard: File | null;
  pastInsuranceCertificate: File | null;
  vehicleId: string;
  clientId: string;
  identificationDocumentUrl: string;
  yellowCardUrl: string;
  pastInsuranceCertificateUrl: string;
  isNewClient: boolean;
  isNewVehicle: boolean;
  amount: string;
  netPremium: string;
  paymentInstructions: string;
  invoice: File | null;
  companyCommission: string;
  administrationFees: string;
  proofOfPayment: File | null;
  transactionId: string;
  policeNumber: string;
  insuranceCertificate: File | null;
  contract: File | null;
  receipt: File | null;
  ebm: File | null;
  status: ApplicationStatus;
  insuranceEndAt: string;
  wantsToAssignAgent: 'yes' | 'no' | '';
  assignToAgent: string;
  deductAgentAssignmentCommission: 'yes' | 'no';
}
