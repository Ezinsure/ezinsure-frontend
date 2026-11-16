import type { LineTimelineEventType, StageTone } from '../domain';

interface TimelineMeta {
  label: string;
  tone: StageTone;
}

export const LINE_TIMELINE_META: Record<LineTimelineEventType, TimelineMeta> = {
  SUBMITTED: { label: 'Submitted', tone: 'slate' },
  SONARWA_APPROVED: { label: 'Approved by SONARWA', tone: 'sky' },
  SONARWA_REJECTED: { label: 'Rejected by SONARWA', tone: 'rose' },
  ADMIN_APPROVED: { label: 'Approved by admin', tone: 'sky' },
  ADMIN_REJECTED: { label: 'Rejected by admin', tone: 'rose' },
  PAYOUT_PREPARED: { label: 'Payout prepared', tone: 'sky' },
  PAID_TO_VET: { label: 'Paid to vet', tone: 'violet' },
  STATEMENT_ISSUED: { label: 'Billed to SONARWA', tone: 'orange' },
  REIMBURSED: { label: 'Reimbursed by SONARWA', tone: 'emerald' },
  MISMATCH_RECORDED: { label: 'Difference recorded', tone: 'amber' },
  MISMATCH_RESOLVED: { label: 'Difference resolved', tone: 'teal' },
};
