'use client';

import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApplicationStepContent } from '@/features/livestock-application/components/application-step-content';
import { LIVESTOCK_APPLICATION_STEPS, LIVESTOCK_FORM_LABELS } from '@/features/livestock-application/labels';
import type { LivestockApplicationFormMode } from '@/features/livestock-application/types';
import { useLivestockApplicationForm } from '@/features/livestock-application/use-livestock-application-form';

interface LivestockApplicationFormProps {
  mode?: LivestockApplicationFormMode;
}

export function LivestockApplicationForm({ mode = 'create' }: LivestockApplicationFormProps) {
  const form = useLivestockApplicationForm(undefined, mode);
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
    handleSubmit,
  } = form;

  const currentStep = LIVESTOCK_APPLICATION_STEPS[stepIndex];
  const isLastStep = stepIndex === LIVESTOCK_APPLICATION_STEPS.length - 1;
  const premiumStepIndex = LIVESTOCK_APPLICATION_STEPS.findIndex((s) => s.id === 'premiumInfo');

  useEffect(() => {
    if (mode === 'create') loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stepIndex === premiumStepIndex) onEnterPremiumStep();
  }, [stepIndex, premiumStepIndex, onEnterPremiumStep]);

  const goNext = () => {
    if (!validateCurrentStep(currentStep.id)) return;
    const nextIndex = Math.min(stepIndex + 1, LIVESTOCK_APPLICATION_STEPS.length - 1);
    setStepIndex(nextIndex);
    if (LIVESTOCK_APPLICATION_STEPS[nextIndex]?.id === 'premiumInfo') {
      onEnterPremiumStep();
    }
  };

  const goPrev = () => setStepIndex((i) => Math.max(i - 1, 0));

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          SONARWA · Livestock
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
          {LIVESTOCK_FORM_LABELS.formTitle}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{LIVESTOCK_FORM_LABELS.formSubtitle}</p>
      </header>

      <nav aria-label="Progress" className="mb-8 overflow-x-auto">
        <ol className="flex min-w-max gap-2">
          {LIVESTOCK_APPLICATION_STEPS.map((step, index) => {
            const done = index < stepIndex;
            const active = index === stepIndex;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  disabled={isReadOnly && !active}
                  onClick={() => {
                    if (index <= stepIndex) setStepIndex(index);
                  }}
                  className={[
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition',
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : done
                        ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
                      active ? 'bg-white/20' : 'bg-white',
                    ].join(' ')}
                  >
                    {done ? <Check className="h-3 w-3" /> : index + 1}
                  </span>
                  <span className="max-w-[8rem] truncate hidden sm:inline">{step.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <ApplicationStepContent
          stepId={currentStep.id}
          values={values}
          errors={errors}
          disabled={isReadOnly}
          setField={setField}
          updateLivestockItem={updateLivestockItem}
          addLivestockItem={addLivestockItem}
          removeLivestockItem={removeLivestockItem}
          mergeLivestockItems={mergeLivestockItems}
        />

        {submitMessage && (
          <p className="mt-6 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            {submitMessage}
          </p>
        )}

        {!isReadOnly && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={saveDraft}>
                {LIVESTOCK_FORM_LABELS.saveDraft}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={goPrev}
                disabled={stepIndex === 0}
              >
                {LIVESTOCK_FORM_LABELS.previous}
              </Button>
              {!isLastStep ? (
                <Button type="button" variant="primary" onClick={goNext}>
                  {LIVESTOCK_FORM_LABELS.next}
                </Button>
              ) : (
                <Button type="button" variant="primary" onClick={handleSubmit}>
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
