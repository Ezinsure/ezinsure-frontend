import type { Application } from '@/features/admin-motor-applications/types';

export type PlateLookupViewRole = 'admin' | 'finance' | 'super_admin';

export type PlateLookupPerformerKind = 'admin' | 'agent' | 'client';

export interface PlateLookupVehicleMeta {
  vehicleType?: string;
  chasisNumber?: string;
  vehicleUse?: string;
}

export interface PlateLookupPerformer {
  kind: PlateLookupPerformerKind;
  name: string;
}

export interface PlateLookupApplicationRow {
  _id: string;
  applicationNumber: string;
  submittedAt: string;
  status: string;
  insuranceCategory: string;
  netPremium: number;
  amount: number;
  policeNumber?: string;
  clientName: string;
  performedBy: PlateLookupPerformer;
  /** Full application when API returns nested payload; used for details modal. */
  application: Application;
}

export interface PlateLookupStats {
  applicationCount: number;
  totalNetPremium: number;
  /** Sum of `amount` for payment_verified + insurance_issued only. */
  totalAmountPaid: number;
}

export interface PlateLookupResult {
  plateNumber: string;
  startDate: string;
  endDate: string;
  vehicle?: PlateLookupVehicleMeta;
  stats: PlateLookupStats;
  applications: PlateLookupApplicationRow[];
}

export interface PlateLookupQuery {
  plateNumber: string;
  startDate: string;
  endDate: string;
}
