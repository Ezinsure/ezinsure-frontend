/**
 * While livestock workflow APIs are not live, simulate requests locally and keep
 * all workflow actions visible so the full lifecycle can be tested end-to-end.
 * Set to false once all backends are wired — UI will then gate actions by status.
 */
export const LIVESTOCK_WORKFLOW_DEMO_MODE = true;

/** Endpoints wired to the real backend (always call API even when demo mode is on). */
export const LIVESTOCK_WORKFLOW_LIVE = {
  applicationDetail: true,
  issueInsurance: true,
  uploadSignedSubsidy: true,
  reviewSonarwaSubsidy: true,
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
