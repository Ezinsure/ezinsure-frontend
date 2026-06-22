"use client";

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Navigation } from '@/components/ui/navigation';
import { Footer } from '@/components/ui/footer';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { isAuthenticatedAppPath } from '@/shared/routing/paths';

interface MainLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  showNav?: boolean;
  containerClass?: string;
  fullWidth?: boolean;
}

export const MainLayout = ({
  children,
  showFooter = true,
  showNav = true,
  containerClass = "py-16", 
  fullWidth = false,
}: MainLayoutProps) => {
  const { ToastContainer } = useToast();
  const { user } = useAuth();
  const pathname = usePathname();
  const useAppChrome = Boolean(user) && isAuthenticatedAppPath(pathname);
  const showNavigation = showNav && !useAppChrome;
  const showPageFooter = showFooter && !useAppChrome;

  return (
    <>
      {showNavigation && <Navigation />}
      
      <main
        className={`min-h-screen ${useAppChrome ? 'py-0' : containerClass} overflow-hidden`}
      >
        {fullWidth ? (
          children
        ) : (
          <div className="container mx-auto px-4">
            {children}
          </div>
        )}
      </main>
      
      {showPageFooter && <Footer />}
      <ToastContainer />
    </>
  );
};