import { redirect } from 'next/navigation';

/** Legacy path — renamed to commission-requests. */
export default function LegacyVetCommissionClaimsRedirect() {
  redirect('/vet/livestock/commission-requests');
}
