import { redirect } from 'next/navigation';

/** Legacy path — renamed to commission-requests. */
export default function LegacySonarwaCommissionClaimsRedirect() {
  redirect('/sonarwa/livestock/commission-requests');
}
