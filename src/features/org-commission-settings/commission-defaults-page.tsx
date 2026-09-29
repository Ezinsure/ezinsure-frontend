'use client';

import { CommissionDefaultsForm } from './commission-defaults-form';

export function CommissionDefaultsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Commission settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure organisation-wide default company commission rates for
          livestock and motor.
        </p>
      </header>

      <CommissionDefaultsForm />
    </div>
  );
}
