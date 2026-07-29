/**
 * Livestock workflow APIs are live. The UI gates every workflow step and action by
 * the application's real status and the viewer's role, so only the necessary /
 * available / next step is shown. Flip back to `true` only to demo the full
 * lifecycle locally with simulated requests.
 */
export const LIVESTOCK_WORKFLOW_DEMO_MODE = false;

/** Endpoints wired to the real backend (always call API even when demo mode is on). */
export const LIVESTOCK_WORKFLOW_LIVE = {
  applicationDetail: true,
  uploadPaymentProof: true,
  issueInsurance: true,
  uploadSignedSubsidy: true,
  reviewSonarwaSubsidy: true,
  verifyPaymentProof: true,
  approveCommission: true,
  markCommissionPaid: true,
} as const;

export type LivestockWorkflowLiveFeature = keyof typeof LIVESTOCK_WORKFLOW_LIVE;

export function isLivestockWorkflowApiLive(feature: LivestockWorkflowLiveFeature): boolean {
  return LIVESTOCK_WORKFLOW_LIVE[feature] || !LIVESTOCK_WORKFLOW_DEMO_MODE;
}

export function showAllLivestockWorkflowActions(): boolean {
  return LIVESTOCK_WORKFLOW_DEMO_MODE;
}

/** Use demo visibility when enabled; otherwise respect production permission checks. */
export function resolveWorkflowActionVisible(
  roleAllowed: boolean,
  statusAllowed: boolean,
): boolean {
  if (LIVESTOCK_WORKFLOW_DEMO_MODE) return roleAllowed;
  return roleAllowed && statusAllowed;
}
