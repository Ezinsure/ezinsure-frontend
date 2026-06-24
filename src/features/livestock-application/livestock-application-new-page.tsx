'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApplicationIntakeStep } from '@/features/livestock-application/components/intake/application-intake-step';
import { LivestockApplicationForm } from '@/features/livestock-application/livestock-application-form';
import { LIVESTOCK_APPLICATION_INTAKE_KEY } from '@/features/livestock-application/constants';
import type { ApplicationIntakeSelection } from '@/features/livestock-application/domain/form-profiles';
import { resolveFormProfile } from '@/features/livestock-application/domain/form-profiles';

type FlowPhase = 'intake' | 'form';

const DEFAULT_INTAKE: ApplicationIntakeSelection = {
  speciesGroup: 'CATTLE',
  ownerMode: 'SINGLE_OWNER',
  girinka: '',
};

export default function LivestockApplicationNewPage() {
  const [phase, setPhase] = useState<FlowPhase>('intake');
  const [intake, setIntake] = useState<ApplicationIntakeSelection>(DEFAULT_INTAKE);
  const [girinkaError, setGirinkaError] = useState<string | undefined>();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LIVESTOCK_APPLICATION_INTAKE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ApplicationIntakeSelection;
        setIntake({ ...DEFAULT_INTAKE, ...parsed });
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
    if (intake.speciesGroup === 'CATTLE' && !intake.girinka) {
      setGirinkaError('Hitamo niba iri muri Girinka');
      return;
    }
    setGirinkaError(undefined);
    sessionStorage.setItem(LIVESTOCK_APPLICATION_INTAKE_KEY, JSON.stringify(intake));
    setPhase('form');
  }, [intake]);

  const handleIntakeChange = useCallback((next: ApplicationIntakeSelection) => {
    setIntake(next);
    if (next.girinka) setGirinkaError(undefined);
  }, []);

  const handleBackToIntake = () => {
    sessionStorage.removeItem(LIVESTOCK_APPLICATION_INTAKE_KEY);
    setPhase('intake');
  };

  if (phase === 'intake' || !profile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-8 sm:px-6 lg:px-8">
        <ApplicationIntakeStep
          value={intake}
          onChange={handleIntakeChange}
          onContinue={handleContinueIntake}
          girinkaError={girinkaError}
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

        <LivestockApplicationForm
          mode="create"
          formProfile={profile}
          intake={intake}
          initialValues={{ girinka: intake.girinka ?? '' }}
        />
      </div>
    </div>
  );
}
