import type {
  LivestockApplicationPackage,
  LivestockApplicationStatus,
} from '@/features/livestock-application/domain/application-types';
import {
  APPLICATION_STATUS_LABELS,
  STATUS_TIMELINE_ORDER,
} from '@/features/livestock-application/domain/application-status';
import { resolveSubsidyEligibility } from '@/features/livestock-application/utils/subsidy-eligibility';

export type TimelineStepState = 'completed' | 'current' | 'upcoming';

export interface ApplicationTimelineStep {
  status: LivestockApplicationStatus;
  label: string;
  state: TimelineStepState;
}

const SUBSIDY_ONLY_TIMELINE_STATUSES = new Set<LivestockApplicationStatus>([
  'SUBSIDY_DOC_REQUIRED',
  'SUBSIDY_SECTOR_SIGNED',
]);

function isSubsidyOnlyTimelineStatus(status: LivestockApplicationStatus): boolean {
  return SUBSIDY_ONLY_TIMELINE_STATUSES.has(status) || status.startsWith('SUBSIDY_SECTOR');
}

function sonarwaReviewComplete(application: LivestockApplicationPackage): boolean {
  return (
    application.status === 'PENDING_ADMIN_REVIEW' ||
    application.status === 'READY_TO_BE_PAID' ||
    application.status === 'PAID' ||
    application.status === 'COMMISSION_APPROVED' ||
    application.subsidyCase.status === 'SONARWA_APPROVED'
  );
}

function mapStatusToTimelineIndex(
  application: LivestockApplicationPackage,
): number {
  const { status, paymentProof } = application;
  const hasProofDocument = Boolean(paymentProof.documentUrl?.trim());

  if (status === 'SUBSIDY_SECTOR_PENDING') {
    return STATUS_TIMELINE_ORDER.indexOf('SUBSIDY_DOC_REQUIRED');
  }

  if (status === 'SUBSIDY_SECTOR_SIGNED' || status === 'SUBSIDY_VET_SIGNED') {
    if (!sonarwaReviewComplete(application)) {
      return STATUS_TIMELINE_ORDER.indexOf('SUBSIDY_SONARWA_APPROVED');
    }
    return STATUS_TIMELINE_ORDER.indexOf('SUBSIDY_SECTOR_SIGNED');
  }

  const direct = STATUS_TIMELINE_ORDER.indexOf(status);
  if (direct !== -1) return direct;

  if (status === 'DRAFT') return -1;

  if (status === 'SUBMITTED') {
    if (hasProofDocument || paymentProof.status === 'SUBMITTED') {
      return STATUS_TIMELINE_ORDER.indexOf('PAYMENT_PROOF_SUBMITTED');
    }
    if (paymentProof.status === 'VERIFIED') {
      return STATUS_TIMELINE_ORDER.indexOf('PAYMENT_VERIFIED');
    }
    return STATUS_TIMELINE_ORDER.indexOf('PAYMENT_PROOF_REQUIRED');
  }

  if (status === 'REJECTED' || status === 'CANCELLED') {
    if (paymentProof.status === 'REJECTED') {
      return STATUS_TIMELINE_ORDER.indexOf('PAYMENT_PROOF_SUBMITTED');
    }
    return STATUS_TIMELINE_ORDER.indexOf('SUBMITTED');
  }

  if (status === 'INSURANCE_ISSUED' && !sonarwaReviewComplete(application)) {
    const subsidyRequired = resolveSubsidyEligibility(application).required;
    if (!subsidyRequired) {
      return STATUS_TIMELINE_ORDER.indexOf('SUBSIDY_SONARWA_APPROVED');
    }
    if (
      application.subsidyCase.status === 'DOC_GENERATED' ||
      application.subsidyCase.status === 'SECTOR_PENDING'
    ) {
      return STATUS_TIMELINE_ORDER.indexOf('SUBSIDY_DOC_REQUIRED');
    }
    return STATUS_TIMELINE_ORDER.indexOf('INSURANCE_ISSUED');
  }

  if (hasProofDocument || paymentProof.status === 'SUBMITTED') {
    return STATUS_TIMELINE_ORDER.indexOf('PAYMENT_PROOF_SUBMITTED');
  }

  if (paymentProof.status === 'VERIFIED') {
    return STATUS_TIMELINE_ORDER.indexOf('PAYMENT_VERIFIED');
  }

  if (paymentProof.status === 'PENDING') {
    return STATUS_TIMELINE_ORDER.indexOf('PAYMENT_PROOF_REQUIRED');
  }

  return STATUS_TIMELINE_ORDER.indexOf('SUBMITTED');
}

function timelineLabel(
  status: LivestockApplicationStatus,
  application: LivestockApplicationPackage,
  state: TimelineStepState,
): string {
  if (
    status === 'SUBSIDY_SONARWA_APPROVED' &&
    state === 'current' &&
    !sonarwaReviewComplete(application)
  ) {
    return 'SONARWA review';
  }
  return APPLICATION_STATUS_LABELS[status];
}

/** Derive timeline steps from the live application package (status + payment + subsidy). */
export function resolveApplicationTimelineSteps(
  application: LivestockApplicationPackage,
): ApplicationTimelineStep[] {
  const currentIdx = mapStatusToTimelineIndex(application);
  const subsidyRequired = resolveSubsidyEligibility(application).required;

  return STATUS_TIMELINE_ORDER.flatMap((status, index) => {
    if (!subsidyRequired && isSubsidyOnlyTimelineStatus(status)) {
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
        label: timelineLabel(status, application, state),
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
