import type { LivestockApplicationViewRole } from '@/features/livestock-application/domain/application-types';

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

export function buildWorkflowStepsNav(
  viewRole: LivestockApplicationViewRole,
): ApplicationDetailNavItem[] {
  return WORKFLOW_ITEMS.filter((item) => {
    if (item.id === 'issue-insurance' || item.id === 'sonarwa') {
      return viewRole === 'admin' || viewRole === 'super_admin';
    }
    if (item.id === 'commission') {
      return viewRole === 'admin' || viewRole === 'finance' || viewRole === 'super_admin';
    }
    if (item.id === 'payment-proof' && viewRole === 'finance') {
      return false;
    }
    if (item.id === 'subsidy' && viewRole === 'finance') {
      return false;
    }
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
