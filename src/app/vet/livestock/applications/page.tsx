'use client';

import Link from 'next/link';
import { FileText, Upload } from 'lucide-react';

export default function VetLivestockApplicationsPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--light-gray)]">
          <FileText className="h-7 w-7 text-[var(--main-blue)]" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">My Applications</h1>
        <p className="mt-2 text-sm text-gray-600">
          This page will list animals assigned to you, with per-row payment proof upload and status
          tracking. That workflow is coming in the next module.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/vet/livestock/dashboard"
            className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-gray-300"
          >
            Back to dashboard
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--light-gray)] px-5 py-2.5 text-sm font-medium text-gray-600">
            <Upload className="h-4 w-4" />
            Proof upload — coming soon
          </span>
        </div>
      </div>
    </div>
  );
}
