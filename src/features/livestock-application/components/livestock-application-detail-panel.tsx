'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import type {
  LivestockApplicationPackage,
  LivestockApplicationViewRole,
} from '@/features/livestock-application/domain/application-types';
import { LivestockApplicationDetailView } from '@/features/livestock-application/components/livestock-application-detail-view';

interface LivestockApplicationDetailPanelProps {
  isOpen: boolean;
  application: LivestockApplicationPackage | null;
  isLoading?: boolean;
  error?: string | null;
  viewRole?: LivestockApplicationViewRole;
  onClose: () => void;
  onUpdated?: () => void;
}

/**
 * Full-viewport modal: dark backdrop over sidebar + main, wide slide-over for details.
 */
export function LivestockApplicationDetailPanel({
  isOpen,
  application,
  isLoading = false,
  error = null,
  viewRole = 'vet',
  onClose,
  onUpdated,
}: LivestockApplicationDetailPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-[2px]"
            aria-label="Close application details"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 340, mass: 0.9 }}
            className="fixed inset-0 z-[201] flex flex-col overflow-hidden bg-white shadow-2xl sm:inset-auto sm:bottom-0 sm:right-0 sm:top-0 sm:w-full sm:max-w-[min(100%,40rem)] md:max-w-[min(100%,52rem)] lg:max-w-[min(100%,68rem)] xl:max-w-[min(100%,84rem)] 2xl:max-w-[min(100%,92rem)]"
            role="dialog"
            aria-modal="true"
            aria-label="Application details"
          >
            {isLoading && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-slate-600">Loading application details…</p>
              </div>
            )}

            {!isLoading && error && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="max-w-md text-sm text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                >
                  Back to applications
                </button>
              </div>
            )}

            {!isLoading && !error && application && (
              <LivestockApplicationDetailView
                application={application}
                viewRole={viewRole}
                layout="panel"
                backLabel="Back to all applications"
                onClose={onClose}
                onUpdated={onUpdated}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
