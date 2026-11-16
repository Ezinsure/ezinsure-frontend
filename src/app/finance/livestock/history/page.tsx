import { redirect } from 'next/navigation';

/** Replaced by Payouts history. */
export default function LivestockFinancePaymentHistoryPage() {
  redirect('/finance/livestock/payouts?tab=history');
}
