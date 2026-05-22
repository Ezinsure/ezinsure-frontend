'use client';

import { LivestockApplicationForm } from '@/features/livestock-application/livestock-application-form';

export default function LivestockApplicationNewPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <LivestockApplicationForm mode="create" />
    </div>
  );
}
