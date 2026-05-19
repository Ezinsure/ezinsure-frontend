'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { VetApplicationStatusBadge } from '@/features/vet-portal/vet-application-status-badge';
import type { VeterinaryApplication } from '@/features/vet-portal/types';
import { formatRwf, formatStatusLabel } from '@/features/vet-portal/utils';
import { formatDateUTC } from '@/utils/date-formatter';

interface VetApplicationDetailsModalProps {
  application: VeterinaryApplication | null;
  onClose: () => void;
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-900 break-words">{value ?? '—'}</p>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</h4>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function VetApplicationDetailsModal({ application, onClose }: VetApplicationDetailsModalProps) {
  if (!application) return null;

  const location = [application.district, application.sector, application.cell, application.village]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vet-app-details-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              Livestock application
            </p>
            <h2 id="vet-app-details-title" className="mt-1 truncate text-xl font-semibold text-slate-900">
              {application.applicationNumber}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Policy {application.policyNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <VetApplicationStatusBadge status={application.status} />
            <span className="text-xs text-slate-500">
              Submitted {formatDateUTC(application.submittedAt)}
            </span>
          </div>

          <DetailSection title="Owner">
            <DetailField label="Full name" value={application.ownerName} />
            <DetailField label="Phone" value={application.ownerPhone} />
            <DetailField label="Date of birth" value={formatDateUTC(application.ownerDateOfBirth)} />
            <DetailField label="Age" value={application.ownerAge} />
          </DetailSection>

          <DetailSection title="Animal">
            <DetailField label="Chip number" value={application.chipNumber} />
            <DetailField label="Species / breed" value={`${application.species} · ${application.breed}`} />
            <DetailField label="Type / sex" value={`${application.animalType} · ${application.sex}`} />
            <DetailField label="Date of birth" value={formatDateUTC(application.animalDateOfBirth)} />
            <DetailField label="Chipped date" value={formatDateUTC(application.chippedDate)} />
          </DetailSection>

          <DetailSection title="Insurance & policy">
            <DetailField label="Insurance type" value={application.insuranceType} />
            <DetailField label="Provider" value={application.insuranceProvider} />
            <DetailField label="Payment mode" value={application.modeOfPayment} />
            <DetailField label="Policy start" value={formatDateUTC(application.policyStartDate)} />
            <DetailField label="Policy end" value={formatDateUTC(application.policyEndDate)} />
            <DetailField label="Insurance issued" value={formatDateUTC(application.insuranceIssuedAt)} />
          </DetailSection>

          <DetailSection title="Location">
            <DetailField label="Address" value={location || '—'} />
          </DetailSection>

          <DetailSection title="Financials">
            <DetailField label="Sum assured" value={formatRwf(application.sumAssured)} />
            <DetailField label="Premium rate" value={formatRwf(application.premiumRateAmount)} />
            <DetailField label="Farmer contribution" value={formatRwf(application.farmerContributionAmount)} />
            <DetailField label="Government contribution" value={formatRwf(application.governmentContribution)} />
            <DetailField label="Your commission" value={formatRwf(application.veterinaryCommission)} />
            <DetailField label="Company commission" value={formatRwf(application.companyCommission)} />
          </DetailSection>

          <DetailSection title="Subsidy & payment">
            <DetailField label="Subsidy status" value={application.subsidyStatus} />
            <DetailField label="Paid status" value={application.paidStatus} />
            <DetailField
              label="Commission payment"
              value={formatStatusLabel(application.agentCommissionPaymentStatus)}
            />
          </DetailSection>

          <DetailSection title="Processing">
            <DetailField label="Approved by" value={application.approvedBy} />
            <DetailField label="Approved on" value={formatDateUTC(application.approvedOn)} />
            <DetailField label="Assigned admin" value={application.admin?.fullName} />
            <DetailField label="Agent" value={application.agent?.fullName} />
          </DetailSection>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto sm:min-w-[120px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
