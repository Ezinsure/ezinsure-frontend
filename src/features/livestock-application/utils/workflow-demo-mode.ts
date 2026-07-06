/**
 * While livestock workflow APIs are not live, simulate requests locally and keep
 * all workflow actions visible so the full lifecycle can be tested end-to-end.
 * Set to false once backends are wired — UI will then gate actions by status.
 */
export const LIVESTOCK_WORKFLOW_DEMO_MODE = true;

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
