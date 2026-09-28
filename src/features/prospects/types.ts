/**
 * Motor prospects — leads insured elsewhere, tracked for acquisition at expiry.
 */

export type ProspectSmsReminderStatus =
  | 'pending'
  | 'scheduled'
  | 'sent'
  | 'failed'
  | 'not_applicable';

export interface ProspectAgentSummary {
  _id: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
}

export interface Prospect {
  _id: string;
  phoneNumber: string;
  /** ISO date YYYY-MM-DD or full ISO datetime. */
  insuranceExpiryDate: string;
  fullName?: string;
  currentInsurer?: string;
  insuranceCategory?: string;
  notes?: string;
  agent?: ProspectAgentSummary | null;
  agentId?: string;
  smsReminderStatus: ProspectSmsReminderStatus;
  lastSmsSentAt?: string;
  smsFailureReason?: string;
  createdAt?: string;
  updatedAt?: string;
  daysUntilExpiry?: number;
}

export interface CreateProspectPayload {
  phoneNumber: string;
  insuranceExpiryDate: string;
  fullName?: string;
  currentInsurer?: string;
  insuranceCategory?: string;
  notes?: string;
  /** Admin/staff may assign to an agent; agents create for themselves. */
  agentId?: string;
}

export interface UpdateProspectPayload {
  phoneNumber?: string;
  insuranceExpiryDate?: string;
  fullName?: string;
  currentInsurer?: string;
  insuranceCategory?: string;
  notes?: string;
  agentId?: string;
}

export interface ProspectListFilters {
  search?: string;
  /** Expiry window */
  startDate?: string;
  endDate?: string;
  smsReminderStatus?: ProspectSmsReminderStatus | 'all';
  agentId?: string;
  /** upcoming = expiry >= today; expired = expiry < today */
  bucket?: 'upcoming' | 'expired' | 'all';
}

export interface ProspectListResult {
  items: Prospect[];
  count: number;
}

export const PROSPECT_SMS_STATUS_LABELS: Record<ProspectSmsReminderStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  sent: 'SMS sent',
  failed: 'SMS failed',
  not_applicable: 'N/A',
};

export const PROSPECT_SMS_STATUS_OPTIONS: {
  value: ProspectSmsReminderStatus | 'all';
  label: string;
}[] = [
  { value: 'all', label: 'All SMS statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
];
