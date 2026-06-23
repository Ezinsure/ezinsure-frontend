'use client';

import { Building2, Clock } from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';

export type CompanyPerformanceViewRole = 'admin' | 'finance' | 'super_admin';

function pageCopy(role: CompanyPerformanceViewRole) {
  if (role === 'finance') {
    return { eyebrow: 'Finance · Motor', title: 'Company Performance' };
  }
  if (role === 'super_admin') {
    return { eyebrow: 'Super Admin · Motor', title: 'Company Performance' };
  }
  return { eyebrow: 'Admin · Motor', title: 'Company Performance' };
}

export interface CompanyPerformancePageProps {
  viewRole?: CompanyPerformanceViewRole;
}

export default function CompanyPerformancePage({
  viewRole = 'admin',
}: CompanyPerformancePageProps) {
  const copy = pageCopy(viewRole);

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="container mx-auto max-w-3xl px-4 py-8 lg:py-10">
          <header className="mb-8 mt-12 text-center lg:mt-16">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              {copy.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {copy.title}
            </h1>
          </header>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-10 text-center text-white sm:px-10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                <Building2 className="h-7 w-7" aria-hidden />
              </div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                Coming soon
              </p>
              <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                Company performance insights are on the way
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-blue-100 sm:text-base">
                This page will show company commission from agent-brought clients (5%) and
                admin or self-service applications (10%), including administration fees and a
                paginated list of direct-channel applications.
              </p>
            </div>

            <div className="border-t border-slate-100 px-6 py-8 text-center sm:px-10">
              <p className="text-sm text-slate-600">
                We are preparing the backend APIs for this report. Check back soon for live
                data, filters, and export options.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
