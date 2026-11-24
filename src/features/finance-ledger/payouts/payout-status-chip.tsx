import { PAYOUT_STATUS_LABELS, type PayoutStatus, type StageTone } from '../domain';
import { StatusChip } from '../ui/status-chip';

const TONE: Record<PayoutStatus, StageTone> = {
  PREPARED: 'sky',
  PAID: 'emerald',
  CANCELLED: 'slate',
};

const DESCRIPTION: Record<PayoutStatus, string> = {
  PREPARED: 'Ready to send. Mark as paid once the money has left the bank.',
  PAID: 'Vets have been paid for the lines in this payout.',
  CANCELLED: 'Cancelled. The lines went back to Ready to pay.',
};

export function PayoutStatusChip({ status }: { status: PayoutStatus }) {
  return (
    <StatusChip
      label={PAYOUT_STATUS_LABELS[status]}
      tone={TONE[status]}
      description={DESCRIPTION[status]}
    />
  );
}
