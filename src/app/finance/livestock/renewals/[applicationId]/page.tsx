'use client';

import { useParams } from 'next/navigation';
import { LivestockRenewalFormPage } from '@/features/renewals/livestock-renewal-form-page';

export default function FinanceLivestockRenewalFormRoute() {
  const params = useParams<{ applicationId: string }>();
  return (
    <LivestockRenewalFormPage
      applicationId={String(params.applicationId ?? '')}
      listHref="/finance/livestock/renewals"
      listScope="all"
    />
  );
}
