'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { LivestockApplicationDetailView } from '@/features/livestock-application/components/livestock-application-detail-view';
import type { LivestockApplicationViewRole } from '@/features/livestock-application/domain/application-types';
import { useLivestockApplicationDetail } from '@/features/livestock-application/hooks/use-livestock-applications';

export interface LivestockApplicationDetailPageProps {
  applicationId: string;
  viewRole?: LivestockApplicationViewRole;
  backHref?: string;
  backLabel?: string;
  preferListCache?: boolean;
}

function resolveBackHref(role: LivestockApplicationViewRole): string {
  if (role === 'admin') return '/admin/livestock/applications';
  if (role === 'finance') return '/finance/livestock/applications';
  if (role === 'super_admin') return '/super_admin/livestock/applications';
  return '/vet/livestock/applications';
}

export default function LivestockApplicationDetailPage({
  applicationId,
  viewRole = 'vet',
  backHref,
  backLabel = 'All applications',
  preferListCache = false,
}: LivestockApplicationDetailPageProps) {
  const { application, isLoading, error, reload } = useLivestockApplicationDetail(applicationId, {
    preferListCache,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">
          {error ??
            (preferListCache
              ? 'Application not found in your session. Open it from the applications list first.'
              : 'Not found')}
        </p>
        <Link
          href={backHref ?? resolveBackHref(viewRole)}
          className="mt-4 inline-block text-blue-600"
        >
          {backLabel}
        </Link>
      </div>
    );
  }

  return (
    <LivestockApplicationDetailView
      application={application}
      viewRole={viewRole}
      layout="page"
      backHref={backHref ?? resolveBackHref(viewRole)}
      backLabel={backLabel}
      onUpdated={reload}
    />
  );
}
