'use client';

import { AdminMotorApplicationPage } from '@/features/admin-motor-new-application/admin-new-application-page';

export interface MotorRenewalFormPageProps {
  applicationId: string;
  listHref: string;
  /** Agents see the same application form without admin financial fields. */
  audience?: 'agent' | 'staff';
}

export function MotorRenewalFormPage({
  applicationId,
  listHref,
  audience = 'staff',
}: MotorRenewalFormPageProps) {
  return (
    <AdminMotorApplicationPage
      renewal={{
        applicationId,
        listHref,
        audience,
      }}
    />
  );
}
