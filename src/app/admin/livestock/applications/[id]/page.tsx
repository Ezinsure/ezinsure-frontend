import LivestockApplicationDetailPage from '@/features/livestock-application/livestock-application-detail-page';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <LivestockApplicationDetailPage applicationId={id} viewRole="admin" />;
}
