'use client';

import {
  LEDGER_SOURCES,
  LEDGER_STAGE_META,
  LEDGER_STAGES,
  type LedgerSource,
  type LedgerStage,
} from '../domain';
import type { DateSpan } from '../period/presets';
import { FilterChip } from '../ui/filter-chip';
import { PeriodPicker } from '../ui/period-picker';
import { SearchBox } from '../ui/search-box';

const SOURCE_LABELS: Record<LedgerSource, string> = {
  PLATFORM_VET: 'Platform vets',
  EXTERNAL_VET: 'External vets',
};

const LEDGER_PRESETS = ['thisMonth', 'lastMonth', 'quarter', 'sixMonths', 'thisYear'] as const;

export interface LedgerFilterValues {
  from: string;
  to: string;
  search: string;
  stage: string[];
  source: string;
  mismatch: string;
}

interface LedgerFiltersProps {
  values: LedgerFilterValues;
  onChange: (patch: Partial<LedgerFilterValues>) => void;
  onReset: () => void;
}

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Period, search, stage, source and mismatch filters for the ledger. */
export function LedgerFilters({ values, onChange, onReset }: LedgerFiltersProps) {
  const span: DateSpan = { from: values.from, to: values.to };
  const hasExtraFilters =
    values.search !== '' ||
    values.stage.length > 0 ||
    values.source !== '' ||
    values.mismatch !== '';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <PeriodPicker
          value={span}
          onChange={(next) => onChange(next)}
          presets={LEDGER_PRESETS}
          label="Submitted in"
        />
        <SearchBox
          value={values.search}
          onSearch={(search) => onChange({ search })}
          placeholder="Search contract, client, microchip or vet"
          className="min-w-[16rem] flex-1"
        />
        {hasExtraFilters ? (
          <button
            type="button"
            onClick={onReset}
            className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Stage">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-500">Stage</span>
        {LEDGER_STAGES.map((stage) => (
          <FilterChip
            key={stage}
            size="sm"
            label={LEDGER_STAGE_META[stage as LedgerStage].label}
            title={LEDGER_STAGE_META[stage as LedgerStage].description}
            pressed={values.stage.includes(stage)}
            onClick={() => onChange({ stage: toggleInList(values.stage, stage) })}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Source">
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-500">Source</span>
          <FilterChip size="sm" label="All" pressed={values.source === ''} onClick={() => onChange({ source: '' })} />
          {LEDGER_SOURCES.map((source) => (
            <FilterChip
              key={source}
              size="sm"
              label={SOURCE_LABELS[source]}
              pressed={values.source === source}
              onClick={() => onChange({ source })}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Differences">
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-500">Differences</span>
          <FilterChip
            size="sm"
            label="All"
            pressed={values.mismatch === ''}
            onClick={() => onChange({ mismatch: '' })}
          />
          <FilterChip
            size="sm"
            label="Open only"
            pressed={values.mismatch === 'open'}
            onClick={() => onChange({ mismatch: 'open' })}
            title="Lines where SONARWA paid a different amount"
          />
        </div>
      </div>
    </div>
  );
}
