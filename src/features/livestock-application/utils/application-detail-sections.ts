import type {
  LivestockApplicationPackage,
  LivestockApplicationStatus,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import { resolveSubsidyEligibility } from '@/features/livestock-application/utils/subsidy-eligibility';

export type ApplicationDetailSectionId =
  | 'overview'
  | 'documents'
  | 'application-details'
  | 'owners'
  | 'insured-lines'
  | 'payment-proof'
  | 'issue-insurance'
  | 'subsidy'
  | 'sonarwa'
  | 'commission';

export interface ApplicationDetailNavItem {
  id: ApplicationDetailSectionId;
  label: string;
  description: string;
  stepNumber?: number;
}

const WORKFLOW_ITEMS: ApplicationDetailNavItem[] = [
  {
    id: 'payment-proof',
    label: 'Payment proof',
    description: 'Upload and verify farmer payment receipt',
    stepNumber: 1,
  },
  {
    id: 'issue-insurance',
    label: 'Issue insurance',
    description: 'Upload contract and policy certificate',
    stepNumber: 2,
  },
  {
    id: 'subsidy',
    label: 'Nkunganire (sector)',
    description: 'Download prefilled form and upload signed scan',
    stepNumber: 3,
  },
  {
    id: 'sonarwa',
    label: 'SONARWA review',
    description: 'Verify nkunganire before commission',
    stepNumber: 4,
  },
  {
    id: 'commission',
    label: 'Commission & payment',
    description: 'Finance review and vet commission payout',
    stepNumber: 5,
  },
];

export const APPLICATION_INFO_ITEMS: ApplicationDetailNavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Summary, status, and progress',
  },
  {
    id: 'documents',
    label: 'Documents',
    description: 'Payment proof, nkunganire, and policy files',
  },
  {
    id: 'application-details',
    label: 'Form details',
    description: 'Intake answers and farm information',
  },
  {
    id: 'owners',
    label: 'Owners',
    description: 'Farmer and co-owner records',
  },
  {
    id: 'insured-lines',
    label: 'Animals & lines',
    description: 'Insured animals and premium breakdown',
  },
];

export interface ApplicationDetailNavBranch {
  id: string;
  label: string;
  items: ApplicationDetailNavItem[];
}

const WORKFLOW_STEP_IDS = new Set<ApplicationDetailSectionId>([
  'payment-proof',
  'issue-insurance',
  'subsidy',
  'sonarwa',
  'commission',
]);

export function isWorkflowSection(id: ApplicationDetailSectionId): boolean {
  return WORKFLOW_STEP_IDS.has(id);
}

const POST_INSURANCE_STATUSES = new Set<LivestockApplicationStatus>([
  'INSURANCE_ISSUED',
  'SUBSIDY_DOC_REQUIRED',
  'SUBSIDY_SECTOR_PENDING',
  'SUBSIDY_SECTOR_SIGNED',
  'SUBSIDY_VET_SIGNED',
  'SUBSIDY_SONARWA_APPROVED',
  'PENDING_COMMISSION_REVIEW',
  'COMMISSION_APPROVED',
  'READY_TO_BE_PAID',
  'PAID',
]);

const COMMISSION_STATUSES = new Set<LivestockApplicationStatus>([
  'PENDING_COMMISSION_REVIEW',
  'COMMISSION_APPROVED',
  'READY_TO_BE_PAID',
  'PAID',
]);

function isInsuranceIssued(application: LivestockApplicationPackage): boolean {
  return (
    POST_INSURANCE_STATUSES.has(application.status) ||
    Boolean(application.issuedDocuments?.insuranceCertificate)
  );
}

function isPaymentVerified(application: LivestockApplicationPackage): boolean {
  return (
    application.status === 'PAYMENT_VERIFIED' ||
    application.paymentProof.status === 'VERIFIED' ||
    isInsuranceIssued(application)
  );
}

function isCommissionPhaseReached(application: LivestockApplicationPackage): boolean {
  return (
    COMMISSION_STATUSES.has(application.status) ||
    application.subsidyCase.status === 'SONARWA_APPROVED'
  );
}

/**
 * A workflow step is "relevant" when the application has reached it — i.e. it is
 * the current/next actionable step or an already-completed step. Steps further in
 * the future stay hidden until the application progresses to them.
 */
function isWorkflowStepReached(
  id: ApplicationDetailSectionId,
  application: LivestockApplicationPackage,
): boolean {
  const subsidyRequired = resolveSubsidyEligibility(application).required;

  switch (id) {
    case 'payment-proof':
      return true;
    case 'issue-insurance':
      return isPaymentVerified(application);
    case 'subsidy':
      return isInsuranceIssued(application) && subsidyRequired;
    case 'sonarwa':
      return (
        isInsuranceIssued(application) &&
        (!subsidyRequired ||
          Boolean(application.subsidyCase.uploadedSignedDocumentUrl) ||
          isCommissionPhaseReached(application))
      );
    case 'commission':
      return isCommissionPhaseReached(application);
    default:
      return true;
  }
}

function isWorkflowStepAllowedForRole(
  id: ApplicationDetailSectionId,
  viewRole: LivestockApplicationViewRole,
): boolean {
  if (id === 'issue-insurance' || id === 'sonarwa') {
    return viewRole === 'admin' || viewRole === 'super_admin';
  }
  if (id === 'commission') {
    return viewRole === 'admin' || viewRole === 'finance' || viewRole === 'super_admin';
  }
  if ((id === 'payment-proof' || id === 'subsidy') && viewRole === 'finance') {
    return false;
  }
  return true;
}

/**
 * Build the workflow steps shown in the detail view. Steps are always filtered by
 * role; when an `application` is provided they are additionally narrowed to the
 * steps that are currently relevant (reached / available / next).
 */
export function buildWorkflowStepsNav(
  viewRole: LivestockApplicationViewRole,
  application?: LivestockApplicationPackage,
): ApplicationDetailNavItem[] {
  return WORKFLOW_ITEMS.filter((item) => {
    if (!isWorkflowStepAllowedForRole(item.id, viewRole)) return false;
    if (application && !isWorkflowStepReached(item.id, application)) return false;
    return true;
  });
}

/** @deprecated Use buildWorkflowStepsNav + APPLICATION_INFO_ITEMS */
export function buildApplicationDetailNav(
  viewRole: LivestockApplicationViewRole,
): ApplicationDetailNavBranch[] {
  return [
    { id: 'application', label: 'Application', items: APPLICATION_INFO_ITEMS },
    { id: 'workflow', label: 'Workflow', items: buildWorkflowStepsNav(viewRole) },
  ];
}

export const DEFAULT_DETAIL_SECTION: ApplicationDetailSectionId = 'overview';
