'use client';

import { formatRwf, type ExternalVetsHubTab } from '../domain';

export type ClaimsFunnelStage = {
  id: string;
  label: string;
  count: number;
  amount: number;
  /** Hub tab to open when the stage is selected. */
  tab?: ExternalVetsHubTab;
  tone: 'slate' | 'cyan' | 'amber' | 'emerald' | 'violet' | 'blue';
};

const TONE_CLASS: Record<ClaimsFunnelStage['tone'], string> = {
  slate: 'border-slate-200 bg-slate-50 text-slate-900',
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-950',
  amber: 'border-amber-200 bg-amber-50 text-amber-950',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  violet: 'border-violet-200 bg-violet-50 text-violet-950',
  blue: 'border-blue-200 bg-blue-50 text-blue-950',
};

type Props = {
  stages: ClaimsFunnelStage[];
  onSelectStage?: (stage: ClaimsFunnelStage) => void;
};

/**
 * Horizontal claim-flow funnel for the Commission Claims overview.
 */
export function ClaimsFunnel({ stages, onSelectStage }: Props) {
  const total = stages.reduce((sum, s) => sum + s.count, 0) || 1;

  return (
    <section
      aria-label="Commission claims funnel"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Claim funnel</h2>
          <p className="mt-1 text-sm text-slate-600">
            Pipeline from draft through SONARWA, admin, finance, and paid.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          {stages.reduce((sum, s) => sum + s.count, 0)} open claims across stages
        </p>
      </div>

      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stages.map((stage, index) => {
          const widthPct = Math.max(8, Math.round((stage.count / total) * 100));
          const interactive = Boolean(onSelectStage && stage.tab);
          const className = `relative overflow-hidden rounded-xl border p-3 text-left transition ${TONE_CLASS[stage.tone]} ${
            interactive ? 'hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400' : ''
          }`;

          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
                  {index + 1}. {stage.label}
                </span>
                <span className="text-lg font-semibold tabular-nums">{stage.count}</span>
              </div>
              <p className="mt-1 text-xs opacity-80">{formatRwf(stage.amount)}</p>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-current opacity-40"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </>
          );

          return (
            <li key={stage.id}>
              {interactive ? (
                <button
                  type="button"
                  className={`${className} w-full`}
                  onClick={() => onSelectStage?.(stage)}
                >
                  {body}
                </button>
              ) : (
                <div className={className}>{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
