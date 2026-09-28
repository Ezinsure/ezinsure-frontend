'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SonarwaApplicationsPage from '@/features/sonarwa-portal/sonarwa-applications-page';

function ListFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--sonarwa-primary)]" />
    </div>
  );
}

export default function SonarwaLivestockApplicationsRoutePage() {
  return (
    <Suspense fallback={<ListFallback />}>
      <SonarwaApplicationsPage />
    </Suspense>
  );
}
