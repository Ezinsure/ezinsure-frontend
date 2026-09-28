'use client';

import { useEffect, useState } from 'react';
import { Calendar, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { VetApplicationDetailsModal } from '@/features/vet-portal/vet-application-details-modal';
import { VetApplicationsTable } from '@/features/vet-portal/vet-applications-table';
import type { VeterinaryApplication } from '@/features/vet-portal/types';
import { useVetApplications } from '@/features/vet-portal/use-vet-applications';

const getFirstDayOfMonth = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
};

const getTodayDate = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function VetApplicationsPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(getFirstDayOfMonth);
  const [endDate, setEndDate] = useState(getTodayDate);
  const [selectedApplication, setSelectedApplication] = useState<VeterinaryApplication | null>(null);

  const { applications, isLoading, error, fetchApplications } = useVetApplications(user?._id);

  useEffect(() => {
    void fetchApplications(startDate, endDate);
  }, [fetchApplications, startDate, endDate]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Livestock
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">My Applications</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Livestock policies assigned to you. Open any row to view full application details.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
                <Calendar className="h-3.5 w-3.5" />
                From
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600">
                <Calendar className="h-3.5 w-3.5" />
                To
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={getTodayDate()}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <Button
              type="button"
              variant="primary"
              disabled={isLoading}
              onClick={() => void fetchApplications(startDate, endDate)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <VetApplicationsTable
            applications={applications}
            isLoading={isLoading}
            onViewDetails={setSelectedApplication}
            itemsPerPageDefault={10}
          />
        </section>
      </div>

      <VetApplicationDetailsModal
        application={selectedApplication}
        onClose={() => setSelectedApplication(null)}
      />
    </div>
  );
}
