export type LivestockFinanceApplicationStatusFilter =
  | 'READY_TO_BE_PAID'
  | 'PAYMENT_INITIATED'
  | 'PAID'
  | 'ALL';

export type LivestockFinanceDateRange = {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

export type LivestockFinanceVet = {
  vetId: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  /** Vet profile district (location.district). */
  district?: string;
};

export type LivestockFinanceVetTotals = LivestockFinanceVet & {
  /** Sum of net premium for the vet's applications in the selection. */
  netPremium: number;
  /** Alias for netPremium — matches Patrick memo "Total insurance / Net Premium". */
  totalInsurance: number;
  /** 10% of net premium — vet payout. */
  veterinaryCommission: number;
  /** 3.5% of net premium — Solektra share. */
  solektraCommission: number;
  /** 13.5% of net premium — total commission pool. */
  totalCommission13_5: number;
  applicationsCount: number;
  /** Vet profile district (location.district). */
  district?: string;
};

export type LivestockFinanceApplication = {
  _id: string;
  applicationNumber: string;
  status?: string;
  submittedAt?: string;
  vetId?: string;
  vetName?: string;
  clientName?: string;
  district?: string;
  netPremium?: number;
  veterinaryCommission?: number;
  solektraCommission?: number;
  totalCommission?: number;
};

export type LivestockFinanceVetStats = {
  totalCommission: number;
  totalApplications: number;
  totalVets: number;
  totalNetPremium?: number;
};

/** One vet row inside GET /getLivestockPaidBatchesByYear month block */
export type LivestockPaidHistoryVetRow = {
  vetId: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  totalPaid: number;
};

/** Normalized month block (always 1–12) for payment history UI */
export type LivestockPaidHistoryMonthBlock = {
  monthIndex: number; // 1–12
  monthName: string;
  totalMonthPaid: number;
  vets: LivestockPaidHistoryVetRow[];
};

export type VetCommissionMemoMeta = {
  fromName?: string;
  date?: string;
  dateRange?: LivestockFinanceDateRange;
};
