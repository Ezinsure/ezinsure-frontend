import { formatMoney } from '@/utils/money';
import type { FinanceSummary } from '../domain';
import { StatCard } from '../ui/stat-card';

interface OverviewStatsProps {
  summary: FinanceSummary | undefined;
  loading: boolean;
}

const money = (value: number | undefined) => (value === undefined ? '—' : formatMoney(value));

/** The money flow in order: paid to vets → billed → received → still owed. */
export function OverviewStats({ summary, loading }: OverviewStatsProps) {
  const totals = summary?.totals;
  const lineCount = summary?.rows.reduce((sum, row) => sum + row.paidLineCount, 0);
  const receivedShare =
    totals && totals.billedAmount > 0
      ? `${Math.round((totals.receivedAmount / totals.billedAmount) * 100)}% of what we billed`
      : 'Nothing billed yet';

  return (
    <section aria-label="Money flow" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard
        label="1 · Paid to vets"
        value={money(totals?.paidToVetsAmount)}
        hint={lineCount === undefined ? undefined : `${lineCount.toLocaleString()} lines`}
        loading={loading}
      />
      <StatCard
        label="2 · Billed to SONARWA"
        value={money(totals?.billedAmount)}
        hint="Vet + company commission + VAT"
        loading={loading}
      />
      <StatCard
        label="3 · Received"
        value={money(totals?.receivedAmount)}
        hint={receivedShare}
        tone={totals && totals.receivedAmount > 0 ? 'good' : 'neutral'}
        loading={loading}
      />
      <StatCard
        label="4 · Still owed"
        value={money(totals?.outstandingAmount)}
        hint="Billed − received − written off"
        tone={!totals ? 'neutral' : totals.outstandingAmount > 0 ? 'warning' : 'good'}
        loading={loading}
      />
      <StatCard
        label="Differences"
        value={totals ? totals.openMismatchCount.toLocaleString() : '—'}
        hint={
          totals && totals.openMismatchCount > 0
            ? `${formatMoney(totals.openMismatchAmount)} vs SONARWA`
            : 'Nothing to review'
        }
        tone={totals && totals.openMismatchCount > 0 ? 'bad' : 'neutral'}
        loading={loading}
      />
    </section>
  );
}
