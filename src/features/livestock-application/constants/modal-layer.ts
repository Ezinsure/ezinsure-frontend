/** Stacking order for livestock application overlays (detail panel + nested modals). */
export const LIVESTOCK_MODAL_LAYER = {
  /** Full-screen list → detail slide-over backdrop */
  DETAIL_BACKDROP: 200,
  /** Application detail panel */
  DETAIL_PANEL: 201,
  /** Workflow dialogs opened inside the detail panel */
  WORKFLOW_DIALOG: 300,
  /** Document preview on top of workflow dialogs */
  DOCUMENT_VIEWER: 310,
} as const;
