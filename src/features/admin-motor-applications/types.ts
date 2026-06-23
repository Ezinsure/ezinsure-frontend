export enum ApplicationStatus {
  PENDING = 'pending',
  APPLICATION_APPROVED = 'application_approved',
  WAITING_FOR_USER_ACTION = 'waiting_for_user_action',
  INVOICE_SENT = 'invoice_sent',
  REVIEW_PAYMENT = 'review_payment',
  PAYMENT_VERIFIED = 'payment_verified',
  INSURANCE_ISSUED = 'insurance_issued',
  CANCELLED = 'cancelled',
}

export interface Application {
  _id: string;
  applicationNumber: string;
  insuranceCategory: string;
  insuranceType: string;
  insuranceDuration: string;
  status: string;
  invoice?: string;
  insuranceCertificate?: string;
  proofOfPayment?: string;
  paymentInstructions?: string;
  transactionId?: string;
  /** Police / policy reference number — set when insurance is issued. */
  policeNumber?: string;
  amount?: number;
  netPremium?: number;
  companyCommission?: number;
  agentCommission?: number;
  administrationFees?: string;
  insuranceProvider?: string;
  ebm?: string;
  contract?: string;
  receipt?: string;
  submittedAt: string;
  agent?: {
    _id: string;
    fullName: string;
  } | null;
  admin?: {
    _id: string;
    fullName: string;
  } | null;
  client: {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    address: string;
    nationalID: string;
    identificationDocumentType: string;
    identificationNumber: string;
    province: string;
    district: string;
    sector: string;
    createdAt: string;
  };
  vehicle?: {
    _id: string;
    clientId: string;
    vehicleType: string;
    vehicleAge: string;
    plateNumber?: string;
    chasisNumber?: string;
    vehicleUse: string;
    otherVehicleUse?: string;
    createdAt: string;
  };
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  nationalID?: string;
  yellowCard?: string;
  pastInsuranceCertificate?: string;
  invoiceId?: string;
  invoiceAmount?: string;
  rejectionReason?: string;
  agentId?: string;
  agentFullName?: string;
  reasonForPaymentRejection?: string;
  vehicleType?: string;
  vehicleAge?: string;
  province?: string;
  district?: string;
  sector?: string;
  createdAt?: string;
  insuranceEndAt?: string;
  otp?: string;
  otpExpires?: string;
  isCOMESA?: boolean;
  vehicleUse?: string;
  otherVehicleUse?: string;
  chasisNumber?: string;
  deductAgentAssignmentCommission?: boolean;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export type ApplicationModalType =
  | 'details'
  | 'review'
  | 'invoice'
  | 'verify'
  | 'issue'
  | null;
