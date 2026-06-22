import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import LivestockApplicationsListPage from '@/features/livestock-application/livestock-applications-list-page';

function ListFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}

export default function FinanceLivestockApplicationsPage() {
  return (
    <Suspense fallback={<ListFallback />}>
      <LivestockApplicationsListPage viewRole="finance" />
    </Suspense>
  );
}
