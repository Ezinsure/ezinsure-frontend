'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SonarwaLivestockApplicationRedirectPage({ params }: PageProps) {
  const router = useRouter();

  useEffect(() => {
    void params.then(({ id }) => {
      router.replace(`/sonarwa/livestock/applications?open=${encodeURIComponent(id)}`);
    });
  }, [params, router]);

  return null;
}
