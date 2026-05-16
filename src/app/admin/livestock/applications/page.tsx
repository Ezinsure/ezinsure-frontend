'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';

export default function LivestockApplicationsPlaceholderPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-8 text-center">
        <FileText className="mx-auto h-10 w-10 text-[var(--main-blue)]" />
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Livestock applications</h1>
        <p className="mt-2 text-sm text-gray-600">
          Application queues will appear here after the import and vet proof modules.
        </p>
        <Link
          href="/admin/livestock/dashboard"
          className="mt-6 inline-block text-sm font-medium text-[var(--main-blue)] hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
