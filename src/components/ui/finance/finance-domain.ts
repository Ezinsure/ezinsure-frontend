export type FinanceCurrency = 'RWF';

export type FinanceMonthYear = {
  month: number; // 1-12
  year: number;
  label: string; // e.g. "March 2026"
};

export type FinanceDateRange = {
  startDate: string; // YYYY-MM-DD (local/UTC doesn't matter for UI)
  endDate: string; // YYYY-MM-DD
};

export type FinanceAgent = {
  agentId: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
};

export type FinanceAgentTotals = FinanceAgent & {
  totalCommission: number; // frozen/snapshot depending on context
  applicationsCount: number;
};

export type FinanceClient = {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  nationalID?: string;
  identificationDocumentType?: string;
  identificationNumber?: string;
  province?: string;
  district?: string;
  sector?: string;
  address?: string;
};

export type FinanceVehicle = {
  plateNumber?: string;
  vehicleType?: string;
  vehicleAge?: string;
  vehicleUse?: string;
  otherVehicleUse?: string;
};

export type FinanceApplicationDocuments = {
  nationalID?: string;
  yellowCard?: string;
  pastInsuranceCertificate?: string;
  invoice?: string;
  insuranceCertificate?: string;
  contract?: string;
  receipt?: string;
  ebm?: string;
  proofOfPayment?: string;
};

export type FinanceApplication = {
  _id: string;
  applicationNumber: string;

  status?: string;
  submittedAt?: string; // ISO string (store UTC)

  insuranceCategory?: string;
  insuranceType?: string;
  insuranceDuration?: string;
  insuranceEndAt?: string;
  insuranceProvider?: string;
  policeNumber?: string;
  isCOMESA?: boolean;

  // Client and vehicle
  client?: FinanceClient;
  vehicle?: FinanceVehicle;

  // Payment/commission breakdown (editable before payout; frozen at initiation)
  amount?: number;
  companyCommission?: number;
  administrationFees?: number;
  agentCommission?: number;

  // Snapshot fields (present for payment-initiated / paid contexts)
  agentCommissionSnapshot?: number;
  companyCommissionSnapshot?: number;
  administrationFeesSnapshot?: number;

  // Agent relationship
  agentId?: string;
  agentFullName?: string;

  // Finance documents (URLs/paths)
  documents?: FinanceApplicationDocuments;
};

export type FinanceBatch = {
  id: string; // frontend id (backend will likely use its own id)
  monthYear: FinanceMonthYear;
  status: 'INITIATED' | 'PAID';
  createdAt: string; // ISO
  markedPaidAt?: string; // ISO

  // Snapshot applications & totals included in this batch
  applicationIds: string[];
};

export type FinancePaymentSheet = {
  batchId: string;
  monthYear: FinanceMonthYear;
  agents: FinanceAgentTotals[];
};

/** One agent row inside GET /getPaidBatchesByYear month block */
export type PaidHistoryAgentRow = {
  agentId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  totalPaid: number;
};

/** Normalized month block (always 1–12) for payment history UI */
export type PaidHistoryMonthBlock = {
  monthIndex: number; // 1–12
  monthName: string;
  totalMonthPaid: number;
  agents: PaidHistoryAgentRow[];
};

