'use client';

import { ArrowRight, Layers, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiContractPanel } from '@/features/livestock-application/components/shared/api-contract-panel';
import type { ApplicationIntakeSelection } from '@/features/livestock-application/domain/form-profiles';
import {
  ownerModeLabel,
  speciesGroupLabel,
} from '@/features/livestock-application/domain/form-profiles';
import type {
  LivestockOwnerMode,
  LivestockSpeciesGroup,
} from '@/features/livestock-application/domain/application-types';

interface ApplicationIntakeStepProps {
  value: ApplicationIntakeSelection | null;
  onChange: (value: ApplicationIntakeSelection) => void;
  onContinue: () => void;
}

const SPECIES_OPTIONS: { value: LivestockSpeciesGroup; icon: string }[] = [
  { value: 'CATTLE', icon: '🐄' },
  { value: 'POULTRY', icon: '🐔' },
  { value: 'PIG', icon: '🐷' },
];

export function ApplicationIntakeStep({ value, onChange, onContinue }: ApplicationIntakeStepProps) {
  const selection = value ?? { speciesGroup: 'CATTLE' as LivestockSpeciesGroup, ownerMode: 'SINGLE_OWNER' as LivestockOwnerMode };

  const setSpecies = (speciesGroup: LivestockSpeciesGroup) => {
    onChange({ ...selection, speciesGroup });
  };

  const setOwnerMode = (ownerMode: LivestockOwnerMode) => {
    onChange({ ...selection, ownerMode });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          SONARWA · Livestock
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          New insurance application
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Choose the animal type and ownership structure. One application can include many animals
          under a single payment and nkunganire workflow.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Layers className="h-4 w-4 text-blue-600" />
          Animal type for this application
        </h2>
        <p className="mt-1 text-xs text-slate-500">One species per application (industry standard).</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SPECIES_OPTIONS.map(({ value: v, icon }) => {
            const active = selection.speciesGroup === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setSpecies(v)}
                className={[
                  'rounded-xl border-2 p-4 text-left transition-all',
                  active
                    ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-600/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                <span className="text-2xl">{icon}</span>
                <p className="mt-2 font-semibold text-slate-900">{speciesGroupLabel(v)}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Users className="h-4 w-4 text-blue-600" />
          Ownership structure
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setOwnerMode('SINGLE_OWNER')}
            className={[
              'rounded-xl border-2 p-5 text-left transition-all',
              selection.ownerMode === 'SINGLE_OWNER'
                ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-600/10'
                : 'border-slate-200 hover:border-slate-300',
            ].join(' ')}
          >
            <User className="h-5 w-5 text-blue-600" />
            <p className="mt-2 font-semibold text-slate-900">{ownerModeLabel('SINGLE_OWNER')}</p>
            <p className="mt-1 text-xs text-slate-500">
              Full owner form · one payment proof for all animals
            </p>
          </button>
          <button
            type="button"
            onClick={() => setOwnerMode('MULTI_OWNER')}
            className={[
              'rounded-xl border-2 p-5 text-left transition-all',
              selection.ownerMode === 'MULTI_OWNER'
                ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-600/10'
                : 'border-slate-200 hover:border-slate-300',
            ].join(' ')}
          >
            <Users className="h-5 w-5 text-violet-600" />
            <p className="mt-2 font-semibold text-slate-900">{ownerModeLabel('MULTI_OWNER')}</p>
            <p className="mt-1 text-xs text-slate-500">
              Owner name & phone on each row · simplified form
            </p>
          </button>
        </div>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Selected:{' '}
          <strong>{speciesGroupLabel(selection.speciesGroup)}</strong>
          {' · '}
          <strong>{ownerModeLabel(selection.ownerMode)}</strong>
        </p>
        <Button type="button" variant="primary" size="lg" onClick={onContinue}>
          Continue to application
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <ApiContractPanel contractKey="createApplication" />
    </div>
  );
}
