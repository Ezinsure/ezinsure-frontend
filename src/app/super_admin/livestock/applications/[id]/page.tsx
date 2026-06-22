'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Legacy deep links — open the in-list slide panel instead of a separate page. */
export default function SuperAdminLivestockApplicationRedirectPage({ params }: PageProps) {
  const router = useRouter();

  useEffect(() => {
    void params.then(({ id }) => {
      router.replace(`/super_admin/livestock/applications?open=${encodeURIComponent(id)}`);
    });
  }, [params, router]);

  return null;
}
