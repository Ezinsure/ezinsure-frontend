'use client';

import { useParams } from 'next/navigation';
import { MotorRenewalFormPage } from '@/features/renewals/motor-renewal-form-page';

export default function AgentMotorRenewalFormRoute() {
  const params = useParams<{ applicationId: string }>();
  return (
    <MotorRenewalFormPage
      applicationId={String(params.applicationId ?? '')}
      listHref="/agent/motor/renewals"
    />
  );
}
