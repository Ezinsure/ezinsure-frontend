import type {
  LivestockApplicationPackage,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import { canAdminReviewLivestockPayment } from '@/features/livestock-application/utils/application-timeline';
import { resolveSubsidyEligibility } from '@/features/livestock-application/utils/subsidy-eligibility';

const ADMIN_ROLES = new Set<LivestockApplicationViewRole>(['admin', 'super_admin']);
const FINANCE_ROLES = new Set<LivestockApplicationViewRole>(['admin', 'super_admin', 'finance']);

function isAdminRole(role: LivestockApplicationViewRole): boolean {
  return ADMIN_ROLES.has(role);
}

function isFinanceRole(role: LivestockApplicationViewRole): boolean {
  return FINANCE_ROLES.has(role);
}

const PAYMENT_UPLOAD_APPLICATION_STATUSES = new Set<LivestockApplicationPackage['status']>([
  'SUBMITTED',
  'PAYMENT_PROOF_REQUIRED',
  'PAYMENT_PROOF_SUBMITTED',
]);

/** Application status + paidStatus gates for PUT /uploadProofOfPayment/{id}. */
export function isPaymentProofUploadStatusEligible(
  application: LivestockApplicationPackage,
): boolean {
  if (!PAYMENT_UPLOAD_APPLICATION_STATUSES.has(application.status)) return false;

  const paidStatus = application.paymentProof.status;
  return paidStatus === 'PENDING' || paidStatus === 'REJECTED';
}

/** VETERINARY (own application) or ADMIN may upload payment proof. */
export function canUploadLivestockPaymentProofRole(
  application: LivestockApplicationPackage,
  role: LivestockApplicationViewRole,
  currentUserId?: string,
): boolean {
  if (role === 'admin' || role === 'super_admin') return true;
  if (role !== 'vet') return false;
  if (currentUserId && application.vetId && application.vetId !== currentUserId) return false;
  return true;
}

export function canUploadLivestockPaymentProof(
  application: LivestockApplicationPackage,
  role: LivestockApplicationViewRole,
  currentUserId?: string,
): boolean {
  return (
    canUploadLivestockPaymentProofRole(application, role, currentUserId) &&
    isPaymentProofUploadStatusEligible(application)
  );
}

export function canAdminIssueLivestockInsurance(
  application: LivestockApplicationPackage,
  role: LivestockApplicationViewRole,
): boolean {
  if (!isAdminRole(role)) return false;
  return application.status === 'PAYMENT_VERIFIED';
}

export function canVetDownloadSubsidyDocument(
  application: LivestockApplicationPackage,
  role: LivestockApplicationViewRole,
): boolean {
  if (role !== 'vet') return false;
  if (application.status !== 'INSURANCE_ISSUED') return false;
  return resolveSubsidyEligibility(application).required;
}

export function canVetUploadSignedSubsidy(
  application: LivestockApplicationPackage,
  role: LivestockApplicationViewRole,
): boolean {
  if (role !== 'vet') return false;
  if (!resolveSubsidyEligibility(application).required) return false;
  if (application.subsidyCase.uploadedSignedDocumentUrl) return false;

  const postInsuranceStatuses = new Set([
    'INSURANCE_ISSUED',
    'SUBSIDY_DOC_REQUIRED',
    'SUBSIDY_SECTOR_PENDING',
    'SUBSIDY_SECTOR_SIGNED',
    'SUBSIDY_VET_SIGNED',
  ]);

  return (
    postInsuranceStatuses.has(application.status) ||
    Boolean(application.issuedDocuments?.insuranceCertificate)
  );
}

export function canAdminReviewSonarwaSubsidy(
  application: LivestockApplicationPackage,
  role: LivestockApplicationViewRole,
): boolean {
  if (!isAdminRole(role)) return false;

  const subsidy = resolveSubsidyEligibility(application);

  if (!subsidy.required) {
    return application.status === 'INSURANCE_ISSUED';
  }

  return (
    application.status === 'SUBSIDY_SECTOR_SIGNED' ||
    application.status === 'SUBSIDY_VET_SIGNED' ||
    application.subsidyCase.status === 'SECTOR_SIGNED' ||
    application.subsidyCase.status === 'VET_SIGNED' ||
    Boolean(application.subsidyCase.uploadedSignedDocumentUrl)
  );
}

export function canManageCommissionWorkflow(
  application: LivestockApplicationPackage,
  role: LivestockApplicationViewRole,
): boolean {
  return isFinanceRole(role) && application.status === 'PENDING_COMMISSION_REVIEW';
}

export function canMarkReadyToBePaid(
  application: LivestockApplicationPackage,
  role: LivestockApplicationViewRole,
): boolean {
  return isFinanceRole(role) && application.status === 'PENDING_COMMISSION_REVIEW';
}

export function canMarkCommissionPaid(
  application: LivestockApplicationPackage,
  role: LivestockApplicationViewRole,
): boolean {
  return isFinanceRole(role) && application.status === 'READY_TO_BE_PAID';
}

export function workflowPhaseLabel(application: LivestockApplicationPackage): string {
  if (canAdminReviewLivestockPayment(application)) return 'Payment review';
  if (application.status === 'PAYMENT_VERIFIED') return 'Issue insurance';
  if (application.status === 'INSURANCE_ISSUED' && resolveSubsidyEligibility(application).required) {
    return 'Nkunganire (sector)';
  }
  if (canAdminReviewSonarwaSubsidy(application, 'admin')) return 'SONARWA review';
  if (application.status === 'PENDING_COMMISSION_REVIEW') return 'Commission review';
  if (application.status === 'READY_TO_BE_PAID') return 'Ready to pay';
  if (application.status === 'PAID') return 'Paid';
  return 'In progress';
}
