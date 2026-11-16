import { redirect } from 'next/navigation';

/** Replaced by Payouts (prepared / mark-paid flow). */
export default function LivestockFinancePaymentInitiatedPage() {
  redirect('/finance/livestock/payouts?tab=history&status=PREPARED');
}
