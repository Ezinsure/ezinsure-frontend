'use client';

import { useParams } from 'next/navigation';
import { MotorRenewalFormPage } from '@/features/renewals/motor-renewal-form-page';

export default function AdminMotorRenewalFormRoute() {
  const params = useParams<{ applicationId: string }>();
  return (
    <MotorRenewalFormPage
      applicationId={String(params.applicationId ?? '')}
      listHref="/admin/motor/renewals"
    />
  );
}
