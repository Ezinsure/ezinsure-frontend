'use client';

import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { LivestockApplicationForm } from '@/features/livestock-application/livestock-application-form';
import { useLivestockApplicationDetail } from '@/features/livestock-application/hooks/use-livestock-applications';
import type { LivestockListScope } from '@/features/livestock-application/api/livestock-applications.repository';
import { resolveFormProfile } from '@/features/livestock-application/domain/form-profiles';
import type { CreateLivestockApplicationPayload } from '@/features/livestock-application/domain/application-types';
import { submitRenewalApplication } from '@/features/renewals/renewal-api';
import { livestockPackageToRenewalFormValues } from '@/features/renewals/livestock-package-to-form';
import { isoDateOnly } from '@/features/renewals/date-utils';
import { isPolicyExpired, stillActivePolicyReason } from '@/features/renewals/renewal-eligibility';
import { useApiClient } from '@/utils/apiClient';

export interface LivestockRenewalFormPageProps {
  applicationId: string;
  listHref: string;
  listScope: LivestockListScope;
}

export function LivestockRenewalFormPage({
  applicationId,
  listHref,
  listScope,
}: LivestockRenewalFormPageProps) {
  const router = useRouter();
  const { apiFetch } = useApiClient();
  const { application, isLoading, error } = useLivestockApplicationDetail(applicationId, {
    scope: listScope,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center gap-2 py-16 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading original application…
        </div>
      </MainLayout>
    );
  }

  if (error || !application) {
    return (
      <MainLayout>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <p className="font-semibold">Unable to open this renewal</p>
          <p className="mt-1 text-sm">{error ?? 'Application not found.'}</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push(listHref)}>
            Back to renewals
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (!isPolicyExpired(application.policyEndDate)) {
    return (
      <MainLayout>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <p className="font-semibold">This application is not eligible for renewal yet</p>
          <p className="mt-1 text-sm">{stillActivePolicyReason(application.policyEndDate)}</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push(listHref)}>
            Back to renewals
          </Button>
        </div>
      </MainLayout>
    );
  }

  const intake = {
    speciesGroup: application.speciesGroup,
    ownerMode: application.ownerMode,
    girinka: (application.girinka === 'yes' || application.girinka === 'no'
      ? application.girinka
      : '') as '' | 'yes' | 'no',
  };
  const formProfile = resolveFormProfile(intake);
  const initialValues = livestockPackageToRenewalFormValues(application);

  return (
    <MainLayout>
      <div className="mb-4">
        <Button type="button" variant="outline" size="sm" onClick={() => router.push(listHref)}>
          Back to list
        </Button>
      </div>
      <LivestockApplicationForm
        mode="renewal"
        formProfile={formProfile}
        intake={intake}
        initialValues={initialValues}
        hideDraft
        submitLabel="Create renewal"
        title={`Renew ${application.applicationNumber}`}
        subtitle="Review and update the previous application, then create the renewal. Cover dates start the day after the previous policy ended."
        banner={
          <p className="mb-4 text-sm text-slate-600">
            Previous cover ended {isoDateOnly(application.policyEndDate) || '—'}. New dates are
            pre-filled for a one-year renewal and can be adjusted if needed.
          </p>
        }
        onSubmitted={() => {
          window.setTimeout(() => router.push(listHref), 700);
        }}
        onSubmitOverride={async (payload: CreateLivestockApplicationPayload) => {
          if (!isPolicyExpired(application.policyEndDate)) {
            return {
              success: false,
              error: stillActivePolicyReason(application.policyEndDate),
            };
          }
          try {
            const result = await submitRenewalApplication(apiFetch, {
              originalApplicationId: application._id,
              module: 'livestock',
              application: { ...payload, insuranceType: 'Renewal' },
            });
            return {
              success: true,
              data: {
                _id: result.renewalApplicationId,
                applicationNumber: result.applicationNumber ?? '',
                status: 'SUBMITTED',
              },
            };
          } catch (err) {
            return {
              success: false,
              error:
                err instanceof Error
                  ? err.message
                  : 'Could not create the renewal. Check the application and try again.',
            };
          }
        }}
      />
    </MainLayout>
  );
}
