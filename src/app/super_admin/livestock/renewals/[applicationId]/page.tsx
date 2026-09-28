'use client';

import { useParams } from 'next/navigation';
import { LivestockRenewalFormPage } from '@/features/renewals/livestock-renewal-form-page';

export default function SuperAdminLivestockRenewalFormRoute() {
  const params = useParams<{ applicationId: string }>();
  return (
    <LivestockRenewalFormPage
      applicationId={String(params.applicationId ?? '')}
      listHref="/super_admin/livestock/renewals"
      listScope="all"
    />
  );
}
