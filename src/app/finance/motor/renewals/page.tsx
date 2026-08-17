'use client';

import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function FinanceMotorRenewalsPage() {
  return (
    <RenewalsWorkspacePage
      module="motor"
      title="Motor renewals"
      subtitle="Review upcoming motor cover and process renewals only after the previous policy has expired. A plate with another active policy cannot be renewed."
      formBasePath="/finance/motor/renewals"
    />
  );
}
