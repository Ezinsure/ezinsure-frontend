import { redirect } from 'next/navigation';

/** Old workspace dashboard entry — Finance Home is now Overview. */
export default function FinanceLivestockDashboardPage() {
  redirect('/finance/livestock/overview');
}
