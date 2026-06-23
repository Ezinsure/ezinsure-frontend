import type {
  LivestockApplicationPackage,
  LivestockApplicationStatus,
} from '@/features/livestock-application/domain/application-types';
import {
  APPLICATION_STATUS_LABELS,
  STATUS_TIMELINE_ORDER,
} from '@/features/livestock-application/domain/application-status';

export type TimelineStepState = 'completed' | 'current' | 'upcoming';

export interface ApplicationTimelineStep {
  status: LivestockApplicationStatus;
  label: string;
  state: TimelineStepState;
}

const SUBSIDY_TIMELINE_STATUSES = new Set<LivestockApplicationStatus>([
  'SUBSIDY_DOC_REQUIRED',
  'SUBSIDY_SECTOR_SIGNED',
  'SUBSIDY_SONARWA_APPROVED',
]);

function isSubsidyTimelineStatus(status: LivestockApplicationStatus): boolean {
  return SUBSIDY_TIMELINE_STATUSES.has(status) || status.startsWith('SUBSIDY');
}

function mapStatusToTimelineIndex(
  status: LivestockApplicationStatus,
  paymentProofStatus: LivestockApplicationPackage['paymentProof']['status'],
  hasProofDocument: boolean,
): number {
  const direct = STATUS_TIMELINE_ORDER.indexOf(status);
  if (direct !== -1) return direct;

  if (status === 'SUBSIDY_SECTOR_PENDING') {
    return STATUS_TIMELINE_ORDER.indexOf('SUBSIDY_DOC_REQUIRED');
  }
  if (status === 'SUBSIDY_VET_SIGNED') {
    return STATUS_TIMELINE_ORDER.indexOf('SUBSIDY_SECTOR_SIGNED');
  }

  if (status === 'DRAFT') return -1;

  if (status === 'SUBMITTED') {
    if (hasProofDocument || paymentProofStatus === 'SUBMITTED') {
      return STATUS_TIMELINE_ORDER.indexOf('PAYMENT_PROOF_SUBMITTED');
    }
    if (paymentProofStatus === 'VERIFIED') {
      return STATUS_TIMELINE_ORDER.indexOf('PAYMENT_VERIFIED');
    }
    return STATUS_TIMELINE_ORDER.indexOf('PAYMENT_PROOF_REQUIRED');
  }

  if (status === 'REJECTED' || status === 'CANCELLED') {
    if (paymentProofStatus === 'REJECTED') {
      return STATUS_TIMELINE_ORDER.indexOf('PAYMENT_PROOF_SUBMITTED');
    }
    return STATUS_TIMELINE_ORDER.indexOf('SUBMITTED');
  }

  if (hasProofDocument || paymentProofStatus === 'SUBMITTED') {
    return STATUS_TIMELINE_ORDER.indexOf('PAYMENT_PROOF_SUBMITTED');
  }

  if (paymentProofStatus === 'VERIFIED') {
    return STATUS_TIMELINE_ORDER.indexOf('PAYMENT_VERIFIED');
  }

  if (paymentProofStatus === 'PENDING') {
    return STATUS_TIMELINE_ORDER.indexOf('PAYMENT_PROOF_REQUIRED');
  }

  return STATUS_TIMELINE_ORDER.indexOf('SUBMITTED');
}

/** Derive timeline steps from the live application package (status + payment + subsidy). */
export function resolveApplicationTimelineSteps(
  application: LivestockApplicationPackage,
): ApplicationTimelineStep[] {
  const hasProofDocument = Boolean(application.paymentProof.documentUrl?.trim());
  const currentIdx = mapStatusToTimelineIndex(
    application.status,
    application.paymentProof.status,
    hasProofDocument,
  );
  const subsidyRequired = application.subsidyCase.required;

  return STATUS_TIMELINE_ORDER.flatMap((status, index) => {
    if (!subsidyRequired && isSubsidyTimelineStatus(status)) {
      return [];
    }

    let state: TimelineStepState;
    if (currentIdx === -1) {
      state = index === 0 ? 'current' : 'upcoming';
    } else if (index < currentIdx) {
      state = 'completed';
    } else if (index === currentIdx) {
      state = 'current';
    } else {
      state = 'upcoming';
    }

    return [
      {
        status,
        label: APPLICATION_STATUS_LABELS[status],
        state,
      },
    ];
  });
}

export function canAdminReviewLivestockPayment(
  application: LivestockApplicationPackage,
): boolean {
  if (application.status === 'PAYMENT_PROOF_SUBMITTED') return true;

  return (
    Boolean(application.paymentProof.documentUrl?.trim()) &&
    application.paymentProof.status === 'SUBMITTED'
  );
}
