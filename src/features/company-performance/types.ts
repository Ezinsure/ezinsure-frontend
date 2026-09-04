import type { Application } from '@/features/admin-motor-applications/types';

export type CompanyPerformanceViewRole = 'admin' | 'finance' | 'super_admin';

export type CompanyPerformanceChannel = 'admin' | 'client' | 'agent' | 'unknown';

export interface CompanyPerformanceApplication {
  _id: string;
  applicationNumber: string;
  clientName: string;
  channel: CompanyPerformanceChannel;
  channelLabel: string;
  performerName: string;
  insuranceCategory: string;
  status: string;
  amount: number;
  netPremium: number;
  companyCommission: number;
  administrationFees: number;
  submittedAt: string;
  application: Application;
}

export interface CompanyPerformanceTotals {
  applicationCount: number;
  totalCompanyCommission: number;
  totalAdministrationFees: number;
}

export interface CompanyPerformanceResult {
  applications: CompanyPerformanceApplication[];
  totals: CompanyPerformanceTotals;
  rawPayload: unknown;
}
