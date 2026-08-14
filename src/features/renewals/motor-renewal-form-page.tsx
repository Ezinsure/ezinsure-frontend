'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import type { Application } from '@/features/admin-motor-applications/types';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';
import {
  fetchMotorApplicationForRenewal,
  submitRenewalApplication,
  type MotorRenewalApplicationPayload,
} from '@/features/renewals/renewal-api';
import { computeRenewalPricing } from '@/features/renewals/renewal-pricing';
import { isoDateOnly, nextPolicyPeriod } from '@/features/renewals/date-utils';
import { useApiClient } from '@/utils/apiClient';

export interface MotorRenewalFormPageProps {
  applicationId: string;
  listHref: string;
}

type FormState = {
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  nationalID: string;
  identificationDocumentType: string;
  identificationNumber: string;
  address: string;
  province: string;
  district: string;
  sector: string;
  vehicleType: string;
  vehicleAge: string;
  plateNumber: string;
  chasisNumber: string;
  vehicleUse: string;
  otherVehicleUse: string;
  insuranceCategory: string;
  insuranceDuration: string;
  insuranceProvider: string;
  policyStartDate: string;
  policyEndDate: string;
  amount: string;
  netPremium: string;
  agentCommission: string;
  notes: string;
};

function fromApplication(app: Application): FormState {
  const end = isoDateOnly(app.insuranceEndAt);
  const period = end ? nextPolicyPeriod(end) : { start: '', end: '' };
  const net = app.netPremium ?? app.amount ?? 0;
  return {
    fullName: app.client?.fullName ?? app.fullName ?? '',
    email: app.client?.email ?? app.email ?? '',
    phoneNumber: app.client?.phoneNumber ?? app.phoneNumber ?? '',
    dateOfBirth: isoDateOnly(app.client?.dateOfBirth ?? app.dateOfBirth),
    nationalID: app.client?.nationalID ?? app.nationalID ?? '',
    identificationDocumentType: app.client?.identificationDocumentType ?? 'nationalID',
    identificationNumber: app.client?.identificationNumber ?? '',
    address: app.client?.address ?? app.address ?? '',
    province: app.client?.province ?? app.province ?? '',
    district: app.client?.district ?? app.district ?? '',
    sector: app.client?.sector ?? app.sector ?? '',
    vehicleType: app.vehicle?.vehicleType ?? app.vehicleType ?? '',
    vehicleAge: app.vehicle?.vehicleAge ?? app.vehicleAge ?? '',
    plateNumber: app.vehicle?.plateNumber ?? '',
    chasisNumber: app.vehicle?.chasisNumber ?? app.chasisNumber ?? '',
    vehicleUse: app.vehicle?.vehicleUse ?? app.vehicleUse ?? '',
    otherVehicleUse: app.vehicle?.otherVehicleUse ?? app.otherVehicleUse ?? '',
    insuranceCategory: app.insuranceCategory ?? '',
    insuranceDuration: app.insuranceDuration ?? '12 Months',
    insuranceProvider: app.insuranceProvider ?? '',
    policyStartDate: period.start,
    policyEndDate: period.end,
    amount: net ? String(net) : '',
    netPremium: net ? String(net) : '',
    agentCommission: app.agentCommission != null ? String(app.agentCommission) : '',
    notes: '',
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function MotorRenewalFormPage({ applicationId, listHref }: MotorRenewalFormPageProps) {
  const router = useRouter();
  const { apiFetch } = useApiClient();
  const [original, setOriginal] = useState<Application | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    void fetchMotorApplicationForRenewal(apiFetch, applicationId)
      .then((app) => {
        if (cancelled) return;
        if (!app) {
          setError('Original motor application could not be loaded.');
          setOriginal(null);
          setForm(null);
          return;
        }
        setOriginal(app);
        setForm(fromApplication(app));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load application.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch, applicationId]);

  const set = (key: keyof FormState, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const pricing = useMemo(() => {
    if (!form) return null;
    const net = Number(form.netPremium || form.amount) || 0;
    const commission = Number(form.agentCommission) || 0;
    return computeRenewalPricing({ netPremium: net, agentCommission: commission });
  }, [form]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || !original) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const application: MotorRenewalApplicationPayload = {
        insuranceType: 'Renewal',
        insuranceCategory: form.insuranceCategory,
        insuranceDuration: form.insuranceDuration,
        insuranceProvider: form.insuranceProvider,
        policyStartDate: form.policyStartDate,
        policyEndDate: form.policyEndDate,
        insuranceEndAt: form.policyEndDate,
        client: {
          fullName: form.fullName,
          email: form.email,
          phoneNumber: form.phoneNumber,
          dateOfBirth: form.dateOfBirth,
          address: form.address,
          nationalID: form.nationalID,
          identificationDocumentType: form.identificationDocumentType,
          identificationNumber: form.identificationNumber,
          province: form.province,
          district: form.district,
          sector: form.sector,
        },
        vehicle: {
          vehicleType: form.vehicleType,
          vehicleAge: form.vehicleAge,
          plateNumber: form.plateNumber,
          chasisNumber: form.chasisNumber,
          vehicleUse: form.vehicleUse,
          otherVehicleUse: form.otherVehicleUse,
        },
        amount: Number(form.amount || form.netPremium) || undefined,
        netPremium: Number(form.netPremium || form.amount) || undefined,
        agentCommission: Number(form.agentCommission) || undefined,
      };
      await submitRenewalApplication(apiFetch, {
        originalApplicationId: original._id,
        module: 'motor',
        notes: form.notes || undefined,
        application,
      });
      router.push(listHref);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not create the motor renewal. Check the form and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center gap-2 py-16 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading original policy…
        </div>
      </MainLayout>
    );
  }

  if (error && !form) {
    return (
      <MainLayout>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <p className="font-semibold">Unable to open this renewal</p>
          <p className="mt-1 text-sm">{error}</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push(listHref)}>
            Back to renewals
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (!form || !original) return null;

  const inputClass = 'mt-0 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm';

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl pb-12">
        <Button type="button" variant="outline" size="sm" onClick={() => router.push(listHref)}>
          Back to list
        </Button>
        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
            Motor renewal
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Renew {original.applicationNumber}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Update client, vehicle, or cover details from the previous policy, then create the
            renewal. Previous cover ended {isoDateOnly(original.insuranceEndAt) || '—'}.
          </p>
        </header>

        {pricing && (
          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            <p className="font-semibold">1% renewal discount</p>
            <p className="mt-1 text-xs text-blue-900/90">
              Discount is 1% of net premium and is deducted from agent commission. The backend
              recalculates the stored amounts.
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-blue-800/80">Expected payment</dt>
                <dd className="font-semibold">{formatRwfDisplay(pricing.expectedPaymentAmount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-blue-800/80">Discount</dt>
                <dd className="font-semibold">−{formatRwfDisplay(pricing.discountAmount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-blue-800/80">Agent commission after</dt>
                <dd className="font-semibold">
                  {formatRwfDisplay(pricing.agentCommissionAfterDiscount)}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700">Client</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input className={inputClass} value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
              </Field>
              <Field label="Phone">
                <input className={inputClass} value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)} />
              </Field>
              <Field label="Email">
                <input className={inputClass} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="National ID">
                <input className={inputClass} value={form.nationalID} onChange={(e) => set('nationalID', e.target.value)} />
              </Field>
              <Field label="Date of birth">
                <input className={inputClass} type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
              </Field>
              <Field label="Address">
                <input className={inputClass} value={form.address} onChange={(e) => set('address', e.target.value)} />
              </Field>
              <Field label="Province">
                <input className={inputClass} value={form.province} onChange={(e) => set('province', e.target.value)} />
              </Field>
              <Field label="District">
                <input className={inputClass} value={form.district} onChange={(e) => set('district', e.target.value)} />
              </Field>
              <Field label="Sector">
                <input className={inputClass} value={form.sector} onChange={(e) => set('sector', e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700">Vehicle</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Vehicle type">
                <input className={inputClass} value={form.vehicleType} onChange={(e) => set('vehicleType', e.target.value)} />
              </Field>
              <Field label="Manufacture year">
                <input className={inputClass} value={form.vehicleAge} onChange={(e) => set('vehicleAge', e.target.value)} />
              </Field>
              <Field label="Plate number">
                <input className={inputClass} value={form.plateNumber} onChange={(e) => set('plateNumber', e.target.value)} />
              </Field>
              <Field label="Chassis number">
                <input className={inputClass} value={form.chasisNumber} onChange={(e) => set('chasisNumber', e.target.value)} />
              </Field>
              <Field label="Vehicle use">
                <input className={inputClass} value={form.vehicleUse} onChange={(e) => set('vehicleUse', e.target.value)} />
              </Field>
              <Field label="Other use">
                <input className={inputClass} value={form.otherVehicleUse} onChange={(e) => set('otherVehicleUse', e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700">Cover</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category">
                <input className={inputClass} value={form.insuranceCategory} onChange={(e) => set('insuranceCategory', e.target.value)} />
              </Field>
              <Field label="Duration">
                <input className={inputClass} value={form.insuranceDuration} onChange={(e) => set('insuranceDuration', e.target.value)} />
              </Field>
              <Field label="Provider">
                <input className={inputClass} value={form.insuranceProvider} onChange={(e) => set('insuranceProvider', e.target.value)} />
              </Field>
              <Field label="New start date">
                <input className={inputClass} type="date" value={form.policyStartDate} onChange={(e) => set('policyStartDate', e.target.value)} />
              </Field>
              <Field label="New end date">
                <input className={inputClass} type="date" value={form.policyEndDate} onChange={(e) => set('policyEndDate', e.target.value)} />
              </Field>
              <Field label="Net premium (RWF)">
                <input className={inputClass} value={form.netPremium} onChange={(e) => { set('netPremium', e.target.value); set('amount', e.target.value); }} />
              </Field>
              <Field label="Agent commission (RWF)">
                <input className={inputClass} value={form.agentCommission} onChange={(e) => set('agentCommission', e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes (optional)">
                  <textarea
                    className={`${inputClass} min-h-[80px]`}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(listHref)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating renewal…
                </>
              ) : (
                'Create renewal'
              )}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
