'use client';

import { formatVeterinaryType } from '@/shared/utils/veterinary-user';
import {
  formatOptionalDate,
  type VetApplicationProfile,
} from './vet-application-types';
import { ProfileDetailGrid, ProfileSection } from './profile-section';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    DEACTIVATED: 'bg-rose-100 text-rose-800',
    SENT_FOR_ACTION: 'bg-orange-100 text-orange-800',
    PENDING: 'bg-amber-100 text-amber-900',
  };
  const labels: Record<string, string> = {
    ACTIVE: 'Active',
    DEACTIVATED: 'Deactivated',
    SENT_FOR_ACTION: 'Sent for action',
    PENDING: 'Pending',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] ?? 'bg-slate-100 text-slate-700'
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function VetProfileSummary({ user }: { user: VetApplicationProfile }) {
  const location = [user.province, user.district, user.sector]
    .map((v) => (v ?? '').trim())
    .filter(Boolean)
    .join(' · ');

  const veterinaryTypeLabel = formatVeterinaryType(user.veterinaryType);
  const companyRate =
    user.companyCommissionRate != null && user.companyCommissionRate !== ''
      ? `${user.companyCommissionRate}%`
      : null;

  return (
    <div className="space-y-4">
      <ProfileSection title="Identity">
        <ProfileDetailGrid
          items={[
            { label: 'Full name', value: user.fullName },
            { label: 'Email', value: user.email },
            { label: 'Phone', value: user.phoneNumber },
            { label: 'Date of birth', value: formatOptionalDate(user.dateOfBirth) },
            {
              label: 'Status',
              value: <StatusBadge status={user.status} />,
            },
            { label: 'Applied', value: formatOptionalDate(user.createdAt) },
            { label: 'Address', value: user.address },
            {
              label: 'Veterinarian type',
              value: veterinaryTypeLabel || '—',
            },
          ]}
        />
      </ProfileSection>

      <ProfileSection
        title="Location"
        description="Province, district, and sector from the become-a-vet application."
      >
        <ProfileDetailGrid
          columns={3}
          items={[
            { label: 'Province', value: user.province },
            { label: 'District', value: user.district },
            { label: 'Sector', value: user.sector },
            { label: 'Summary', value: location || '—' },
          ]}
        />
      </ProfileSection>

      <ProfileSection title="Banking & commission">
        <ProfileDetailGrid
          items={[
            { label: 'Bank name', value: user.bankName },
            { label: 'Account number', value: user.bankAccountNumber },
            {
              label: 'Company commission rate',
              value: companyRate,
            },
          ]}
        />
      </ProfileSection>
    </div>
  );
}
