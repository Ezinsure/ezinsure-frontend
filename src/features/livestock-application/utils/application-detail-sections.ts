import type {
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';

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
  /** When true, step is visible but actions are disabled for this role. */
  readOnly?: boolean;
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
    description: 'Upload contract and optional receipt',
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
    description: 'Verify nkunganire before admin review',
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

/**
 * Whether the current role may perform actions on this workflow step.
 * Non-interactive steps remain visible but should render read-only.
 *
 * Vet: Payment proof + Nkunganire (sector signed).
 * SONARWA: SONARWA review only (actions).
 * Finance: Commission & payment.
 * Admin / Super Admin: Issue insurance + review (Mark as PAID is finance-only).
 */
export function isWorkflowStepInteractive(
  id: ApplicationDetailSectionId,
  viewRole: LivestockApplicationViewRole,
): boolean {
  if (viewRole === 'sonarwa') return id === 'sonarwa';
  if (viewRole === 'vet') return id === 'payment-proof' || id === 'subsidy';
  if (viewRole === 'finance') return id === 'commission';
  if (viewRole === 'admin' || viewRole === 'super_admin') {
    return (
      id === 'payment-proof' ||
      id === 'issue-insurance' ||
      id === 'sonarwa' ||
      id === 'commission'
    );
  }
  return false;
}

/**
 * Build the workflow steps shown in the detail view.
 * All process steps are always visible so users understand the full journey.
 * Steps the role cannot act on are marked `readOnly`.
 */
export function buildWorkflowStepsNav(
  viewRole: LivestockApplicationViewRole,
  _application?: unknown,
): ApplicationDetailNavItem[] {
  void _application;
  return WORKFLOW_ITEMS.map((item) => ({
    ...item,
    readOnly: !isWorkflowStepInteractive(item.id, viewRole),
  }));
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
