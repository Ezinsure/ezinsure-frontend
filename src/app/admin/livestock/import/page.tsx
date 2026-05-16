'use client';

import Link from 'next/link';
import { Upload } from 'lucide-react';

export default function LivestockImportPlaceholderPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-xl rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
        <Upload className="mx-auto h-10 w-10 text-[var(--main-blue)]" />
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Import from Tekana</h1>
        <p className="mt-2 text-sm text-gray-600">
          Bulk upload will be implemented in the livestock import module.
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
