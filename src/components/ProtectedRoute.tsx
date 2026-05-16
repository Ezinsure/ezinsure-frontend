'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { getDashboardPath } from '@/shared/routing/paths';
import { resolveUserDefaultProductLine } from '@/shared/utils/product-line-access';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
        if (user?.role) {
          router.push(
            getDashboardPath(user.role, resolveUserDefaultProductLine(user)),
          );
        }
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router]);

  if (isLoading || !isAuthenticated || (allowedRoles && !allowedRoles.includes(user?.role || ''))) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
};