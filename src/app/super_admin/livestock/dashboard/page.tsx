'use client';

import { PawPrint } from 'lucide-react';

export default function SuperAdminLivestockDashboardPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--light-gray)]">
          <PawPrint className="h-7 w-7 text-[var(--main-blue)]" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Livestock insurance</h1>
        <p className="mt-2 text-sm text-gray-600">
          Super admin livestock workspace. Import, applications, and veterinarian management are
          available from the sidebar.
        </p>
      </div>
    </div>
  );
}
