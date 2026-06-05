'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApplicationIntakeStep } from '@/features/livestock-application/components/intake/application-intake-step';
import { ApiContractPanel } from '@/features/livestock-application/components/shared/api-contract-panel';
import { LivestockApplicationForm } from '@/features/livestock-application/livestock-application-form';
import { LIVESTOCK_APPLICATION_INTAKE_KEY } from '@/features/livestock-application/constants';
import type { ApplicationIntakeSelection } from '@/features/livestock-application/domain/form-profiles';
import { resolveFormProfile } from '@/features/livestock-application/domain/form-profiles';

type FlowPhase = 'intake' | 'form';

export default function LivestockApplicationNewPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<FlowPhase>('intake');
  const [intake, setIntake] = useState<ApplicationIntakeSelection | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LIVESTOCK_APPLICATION_INTAKE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ApplicationIntakeSelection;
        setIntake(parsed);
        setPhase('form');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const profile = useMemo(
    () => (intake ? resolveFormProfile(intake) : null),
    [intake],
  );

  const handleContinueIntake = useCallback(() => {
    if (!intake) return;
    sessionStorage.setItem(LIVESTOCK_APPLICATION_INTAKE_KEY, JSON.stringify(intake));
    setPhase('form');
  }, [intake]);

  const handleBackToIntake = () => {
    sessionStorage.removeItem(LIVESTOCK_APPLICATION_INTAKE_KEY);
    setPhase('intake');
  };

  const handleSubmitted = async (applicationId: string) => {
    setSubmitting(true);
    sessionStorage.removeItem(LIVESTOCK_APPLICATION_INTAKE_KEY);
    router.push(`/vet/livestock/applications/${applicationId}`);
  };

  if (phase === 'intake' || !intake || !profile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-8 sm:px-6 lg:px-8">
        <ApplicationIntakeStep
          value={intake}
          onChange={setIntake}
          onContinue={handleContinueIntake}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">{profile.title}</p>
            <p className="text-sm text-slate-700">{profile.description}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleBackToIntake}>
            Change setup
          </Button>
        </div>

        {submitting && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <Loader2 className="h-4 w-4 animate-spin" />
            Redirecting to application…
          </div>
        )}

        <LivestockApplicationForm
          mode="create"
          formProfile={profile}
          intake={intake}
          onSubmitted={handleSubmitted}
        />

        <ApiContractPanel contractKey="createApplication" className="mt-8" />
      </div>
    </div>
  );
}
