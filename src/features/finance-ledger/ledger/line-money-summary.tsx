import { formatMoney } from '@/utils/money';
import type { LedgerLine } from '../domain';
import { MoneyCell } from '../ui/money-cell';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="tabular-nums text-slate-900">{children}</dd>
    </div>
  );
}

/** Money breakdown for one line: premium, commissions, VAT, expected vs received. */
export function LineMoneySummary({ line }: { line: LedgerLine }) {
  return (
    <dl className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <Row label="Net premium">{formatMoney(line.netPremium)}</Row>
      <Row label="Vet commission">{formatMoney(line.vetCommission)}</Row>
      <Row label="Company commission">{formatMoney(line.companyCommission)}</Row>
      <Row label="VAT (18%)">{formatMoney(line.vatAmount)}</Row>
      <div className="border-t border-slate-200 pt-2">
        <Row label="Expected from SONARWA">
          <span className="font-semibold">{formatMoney(line.expectedAmount)}</span>
        </Row>
      </div>
      {line.receivedAmount !== undefined ? (
        <>
          <Row label="Received from SONARWA">{formatMoney(line.receivedAmount)}</Row>
          <Row label="Difference">
            <MoneyCell
              value={line.receivedAmount - line.expectedAmount}
              signed
              tinted
              className="font-medium"
            />
          </Row>
        </>
      ) : null}
    </dl>
  );
}
