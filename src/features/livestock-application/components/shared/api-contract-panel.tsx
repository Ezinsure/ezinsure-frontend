'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Code2 } from 'lucide-react';
import { API_CONTRACTS, type ApiContractKey } from '@/features/livestock-application/api/contracts';

interface ApiContractPanelProps {
  contractKey: ApiContractKey;
  defaultOpen?: boolean;
  className?: string;
}

export function ApiContractPanel({
  contractKey,
  defaultOpen = false,
  className = '',
}: ApiContractPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contract = API_CONTRACTS[contractKey];

  return (
    <div
      className={`rounded-xl border border-dashed border-slate-300 bg-slate-50/80 ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Code2 className="h-4 w-4 text-blue-600" />
          API contract (backend reference)
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-200 px-4 pb-4 pt-3">
          <p className="font-mono text-xs text-blue-700">
            <span className="rounded bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-800">
              {contract.method}
            </span>{' '}
            {contract.path}
          </p>
          {'payload' in contract && contract.payload && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Expected request body
              </p>
              <pre className="max-h-48 overflow-auto rounded-lg bg-white p-3 text-[11px] leading-relaxed text-slate-700 ring-1 ring-slate-200">
                {contract.payload}
              </pre>
            </div>
          )}
          {'response' in contract && contract.response && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Expected response
              </p>
              <pre className="max-h-48 overflow-auto rounded-lg bg-white p-3 text-[11px] leading-relaxed text-slate-700 ring-1 ring-slate-200">
                {contract.response}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
