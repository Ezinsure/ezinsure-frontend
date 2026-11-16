import type { MismatchStatus, StageTone } from '../domain';
import { StatusChip } from '../ui/status-chip';

const META: Record<MismatchStatus, { label: string; tone: StageTone; description: string }> = {
  OPEN: {
    label: 'Open',
    tone: 'amber',
    description: 'Needs a reason from the finance team.',
  },
  EXPLAINED: {
    label: 'Explained',
    tone: 'emerald',
    description: 'A reason was recorded. The amount stands as paid.',
  },
  REBILL: {
    label: 'Rebill',
    tone: 'sky',
    description: 'We will bill SONARWA again for this difference.',
  },
  WRITTEN_OFF: {
    label: 'Written off',
    tone: 'slate',
    description: 'We are absorbing this difference.',
  },
};

export function MismatchStatusChip({ status }: { status: MismatchStatus }) {
  const meta = META[status];
  return <StatusChip label={meta.label} tone={meta.tone} description={meta.description} />;
}
