'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ApplicationStepContent } from '@/features/livestock-application/components/application-step-content';
import { ApplicationStepProgress } from '@/features/livestock-application/components/shared/application-step-progress';
import { createLivestockApplication } from '@/features/livestock-application/api/applications-api';
import type { ApplicationIntakeSelection } from '@/features/livestock-application/domain/form-profiles';
import type { FormProfile } from '@/features/livestock-application/domain/form-profiles';
import { LIVESTOCK_FORM_LABELS } from '@/features/livestock-application/labels';
import type { LivestockApplicationFormMode } from '@/features/livestock-application/types';
import { useLivestockApplicationForm } from '@/features/livestock-application/use-livestock-application-form';

interface LivestockApplicationFormProps {
  mode?: LivestockApplicationFormMode;
  formProfile: FormProfile;
  intake: ApplicationIntakeSelection;
  onSubmitted?: (applicationId: string) => void;
}

export function LivestockApplicationForm({
  mode = 'create',
  formProfile,
  intake,
  onSubmitted,
}: LivestockApplicationFormProps) {
  const form = useLivestockApplicationForm(undefined, mode, formProfile, intake);
  const {
    values,
    setField,
    stepIndex,
    setStepIndex,
    errors,
    isReadOnly,
    submitMessage,
    updateLivestockItem,
    addLivestockItem,
    removeLivestockItem,
    mergeLivestockItems,
    saveDraft,
    loadDraft,
    validateCurrentStep,
    onEnterPremiumStep,
    prepareSubmitPayload,
    stepIds,
  } = form;

  const currentStepId = stepIds[stepIndex];
  const isLastStep = stepIndex === stepIds.length - 1;
  const premiumStepIndex = stepIds.indexOf('premiumInfo');

  useEffect(() => {
    if (mode === 'create') loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stepIndex === premiumStepIndex) onEnterPremiumStep();
  }, [stepIndex, premiumStepIndex, onEnterPremiumStep]);

  const goNext = () => {
    if (!validateCurrentStep(currentStepId)) return;
    const nextIndex = Math.min(stepIndex + 1, stepIds.length - 1);
    setStepIndex(nextIndex);
    if (stepIds[nextIndex] === 'premiumInfo') onEnterPremiumStep();
  };

  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleSubmit = async () => {
    try {
      const result = await createLivestockApplication(prepareSubmitPayload);
      onSubmitted?.(result._id);
    } catch {
      /* stub never throws */
    }
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {LIVESTOCK_FORM_LABELS.formTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{LIVESTOCK_FORM_LABELS.formSubtitle}</p>
      </header>

      <ApplicationStepProgress
        stepIds={stepIds}
        stepIndex={stepIndex}
        onStepClick={setStepIndex}
        disabled={isReadOnly}
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <ApplicationStepContent
          stepId={currentStepId}
          values={values}
          errors={errors}
          disabled={isReadOnly}
          setField={setField}
          updateLivestockItem={updateLivestockItem}
          addLivestockItem={addLivestockItem}
          removeLivestockItem={removeLivestockItem}
          mergeLivestockItems={mergeLivestockItems}
          formProfile={formProfile}
        />

        {submitMessage && (
          <p className="mt-6 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            {submitMessage}
          </p>
        )}

        {!isReadOnly && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
            <Button type="button" variant="outline" size="sm" onClick={saveDraft}>
              {LIVESTOCK_FORM_LABELS.saveDraft}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={goPrev} disabled={stepIndex === 0}>
                {LIVESTOCK_FORM_LABELS.previous}
              </Button>
              {!isLastStep ? (
                <Button type="button" variant="primary" onClick={goNext}>
                  {LIVESTOCK_FORM_LABELS.next}
                </Button>
              ) : (
                <Button type="button" variant="primary" onClick={() => void handleSubmit()}>
                  {LIVESTOCK_FORM_LABELS.submit}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
