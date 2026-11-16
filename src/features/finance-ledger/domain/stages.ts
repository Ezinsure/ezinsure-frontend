/**
 * One lifecycle for every commission line, whichever pipeline it came from.
 *
 * `READY_TO_BE_PAID`, `PAYMENT_INITIATED` and `PAID` keep the values the
 * existing backend already uses, so migration only adds the later stages.
 */
export const LEDGER_STAGES = [
  'IN_REVIEW',
  'READY_TO_BE_PAID',
  'PAYMENT_INITIATED',
  'PAID',
  'BILLED',
  'REIMBURSED',
  'DISPUTED',
  'REJECTED',
] as const;

export type LedgerStage = (typeof LEDGER_STAGES)[number];

export type StageTone =
  | 'slate'
  | 'amber'
  | 'sky'
  | 'violet'
  | 'emerald'
  | 'orange'
  | 'teal'
  | 'rose';

interface StageMeta {
  label: string;
  /** One plain-language sentence for tooltips and the glossary. */
  description: string;
  tone: StageTone;
}

export const LEDGER_STAGE_META: Record<LedgerStage, StageMeta> = {
  IN_REVIEW: {
    label: 'In review',
    description: 'Waiting for SONARWA or admin approval.',
    tone: 'slate',
  },
  READY_TO_BE_PAID: {
    label: 'Ready to pay',
    description: 'Approved. The vet can now be paid.',
    tone: 'amber',
  },
  PAYMENT_INITIATED: {
    label: 'Payout prepared',
    description: 'Included in a payout that has not been marked paid yet.',
    tone: 'sky',
  },
  PAID: {
    label: 'Paid to vet',
    description: 'The vet has been paid. Not yet billed to SONARWA.',
    tone: 'violet',
  },
  BILLED: {
    label: 'Billed to SONARWA',
    description: 'On an issued statement, waiting for SONARWA to reimburse.',
    tone: 'orange',
  },
  REIMBURSED: {
    label: 'Reimbursed',
    description: 'SONARWA has paid for this line.',
    tone: 'emerald',
  },
  DISPUTED: {
    label: 'Disputed',
    description: 'SONARWA will not pay this line as billed.',
    tone: 'rose',
  },
  REJECTED: {
    label: 'Rejected',
    description: 'Rejected during review. It will never be paid.',
    tone: 'rose',
  },
};

export const ledgerStageLabel = (stage: LedgerStage): string =>
  LEDGER_STAGE_META[stage].label;

/** Stages where money has left the company but SONARWA has not fully repaid it. */
export const STAGES_AWAITING_REIMBURSEMENT: readonly LedgerStage[] = [
  'PAID',
  'BILLED',
  'DISPUTED',
];
