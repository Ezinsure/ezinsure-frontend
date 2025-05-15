"use client";

import { ReactNode } from 'react';
import { Navigation } from '@/components/ui/navigation';
import { Footer } from '@/components/ui/footer';
import { useToast } from '@/components/ui/toast';

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

  return (
    <>
      {showNav && <Navigation />}
      
      <main className={`min-h-screen ${containerClass} overflow-hidden`}>
        {fullWidth ? (
          children
        ) : (
          <div className="container mx-auto px-4">
            {children}
          </div>
        )}
      </main>
      
      {showFooter && <Footer />}
      <ToastContainer />
    </>
  );
};