'use client';

import { useParams } from 'next/navigation';
import { MotorRenewalFormPage } from '@/features/renewals/motor-renewal-form-page';

export default function SuperAdminMotorRenewalFormRoute() {
  const params = useParams<{ applicationId: string }>();
  return (
    <MotorRenewalFormPage
      applicationId={String(params.applicationId ?? '')}
      listHref="/super_admin/motor/renewals"
    />
  );
}
