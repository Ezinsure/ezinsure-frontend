'use client';

import { RenewalsWorkspacePage } from '@/features/renewals/renewals-workspace-page';

export default function FinanceLivestockRenewalsPage() {
  return (
    <RenewalsWorkspacePage
      module="livestock"
      title="Livestock renewals"
      subtitle="Review upcoming livestock cover and process renewals only after that application has expired."
      formBasePath="/finance/livestock/renewals"
    />
  );
}
