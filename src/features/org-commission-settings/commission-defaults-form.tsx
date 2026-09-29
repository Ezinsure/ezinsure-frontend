'use client';

import { useEffect, useState } from 'react';
import { Loader2, Percent, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useCompanyCommissionDefaultsApi } from './api';
import {
  FALLBACK_LIVESTOCK_COMPANY_COMMISSION_PERCENT,
  FALLBACK_MOTOR_COMPANY_COMMISSION_PERCENT,
  parseCommissionPercentInput,
  type CompanyCommissionDefaults,
} from './types';

type FieldKey = 'livestock' | 'motor';

function formatUpdatedAt(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

export function CommissionDefaultsForm() {
  const api = useCompanyCommissionDefaultsApi();
  const { showToast, ToastContainer } = useToast();

  const [livestock, setLivestock] = useState(
    String(FALLBACK_LIVESTOCK_COMPANY_COMMISSION_PERCENT),
  );
  const [motor, setMotor] = useState(
    String(FALLBACK_MOTOR_COMPANY_COMMISSION_PERCENT),
  );
  const [baseline, setBaseline] = useState<CompanyCommissionDefaults | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>(
    {},
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void api
      .getDefaults()
      .then((defaults) => {
        if (cancelled) return;
        setBaseline(defaults);
        setLivestock(String(defaults.livestockCompanyCommissionPercent));
        setMotor(String(defaults.motorCompanyCommissionPercent));
      })
      .catch((err) => {
        if (cancelled) return;
        showToast(
          err instanceof Error ? err.message : 'Failed to load defaults',
          'error',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, showToast]);

  function validate(): {
    livestockCompanyCommissionPercent: number;
    motorCompanyCommissionPercent: number;
  } | null {
    const nextErrors: Partial<Record<FieldKey, string>> = {};
    const livestockValue = parseCommissionPercentInput(livestock);
    const motorValue = parseCommissionPercentInput(motor);

    if (livestockValue == null) {
      nextErrors.livestock = 'Enter a number between 0 and 100.';
    }
    if (motorValue == null) {
      nextErrors.motor = 'Enter a number between 0 and 100.';
    }

    setFieldErrors(nextErrors);
    if (livestockValue == null || motorValue == null) return null;

    return {
      livestockCompanyCommissionPercent: livestockValue,
      motorCompanyCommissionPercent: motorValue,
    };
  }

  async function handleSave() {
    const payload = validate();
    if (!payload) return;

    setIsSaving(true);
    try {
      const saved = await api.updateDefaults(payload);
      setBaseline(saved);
      setLivestock(String(saved.livestockCompanyCommissionPercent));
      setMotor(String(saved.motorCompanyCommissionPercent));
      showToast('Commission defaults saved', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to save defaults',
        'error',
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    if (!baseline) return;
    setLivestock(String(baseline.livestockCompanyCommissionPercent));
    setMotor(String(baseline.motorCompanyCommissionPercent));
    setFieldErrors({});
  }

  const updatedLabel = formatUpdatedAt(baseline?.updatedAt);

  return (
    <div className="space-y-6">
      <ToastContainer />

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
            <Percent className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              Default company commission rates
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              These percentages of net premium are applied when creating
              commission requests (livestock) and when motor flows need an org
              company rate. Veterinarians cannot override the livestock rate.
            </p>
            {updatedLabel ? (
              <p className="mt-2 text-xs text-slate-400">
                Last updated {updatedLabel}
              </p>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading defaults…
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Livestock
              </span>
              <span className="mt-1 block text-sm text-slate-700">
                Company commission % of net premium
              </span>
              <div className="relative mt-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  inputMode="decimal"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  value={livestock}
                  onChange={(e) => setLivestock(e.target.value)}
                  disabled={isSaving}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  %
                </span>
              </div>
              {fieldErrors.livestock ? (
                <p className="mt-1.5 text-xs text-rose-600">
                  {fieldErrors.livestock}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-500">
                  Used for livestock commission request batches.
                </p>
              )}
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Motor
              </span>
              <span className="mt-1 block text-sm text-slate-700">
                Company commission % of net premium
              </span>
              <div className="relative mt-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  inputMode="decimal"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  value={motor}
                  onChange={(e) => setMotor(e.target.value)}
                  disabled={isSaving}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  %
                </span>
              </div>
              {fieldErrors.motor ? (
                <p className="mt-1.5 text-xs text-rose-600">{fieldErrors.motor}</p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-500">
                  Org default for motor company commission calculations.
                </p>
              )}
            </label>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Button onClick={() => void handleSave()} disabled={isLoading || isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save defaults
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isLoading || isSaving || !baseline}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
