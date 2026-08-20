'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  COMMISSION_LINE_COLUMN_LABELS,
  formatRwf,
  type ExternalVetCommissionBatch,
} from '../domain';
import { ExternalVetStatusBadge } from './status-badge';

type Props = {
  batch: ExternalVetCommissionBatch;
  onClose: () => void;
  footer?: React.ReactNode;
};

export function BatchDetailPanel({ batch, onClose, footer }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Commission batch
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              {batch.batchNumber}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ExternalVetStatusBadge status={batch.status} />
              {batch.periodLabel ? (
                <span className="text-sm text-slate-600">{batch.periodLabel}</span>
              ) : null}
            </div>
          </div>
          <Button variant="text" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Info label="External vet" value={batch.payee.name} />
            <Info label="Phone" value={batch.payee.phoneNumber} />
            <Info label="Bank" value={batch.payee.bankName} />
            <Info label="Account" value={batch.payee.bankAccountNumber} />
            <Info label="Source file" value={batch.sourceFileName} />
            <Info label="Created by" value={batch.createdByName} />
            <Info
              label="Created at"
              value={new Date(batch.createdAt).toLocaleString()}
            />
            <Info label="Total commission" value={formatRwf(batch.totalCommission)} />
            {batch.reviewedByName ? (
              <Info label="Reviewed by" value={batch.reviewedByName} />
            ) : null}
            {batch.reviewNote ? (
              <Info label="Review note" value={batch.reviewNote} />
            ) : null}
            {batch.paidByName ? (
              <Info label="Paid by" value={batch.paidByName} />
            ) : null}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Lines ({batch.lineCount})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {(
                      [
                        'sn',
                        'contract',
                        'clientName',
                        'typeLivestock',
                        'branch',
                        'sumInsured',
                        'netPremium',
                        'commission',
                      ] as const
                    ).map((key) => (
                      <th key={key} className="whitespace-nowrap px-3 py-2 font-medium">
                        {COMMISSION_LINE_COLUMN_LABELS[key]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batch.lines.map((line) => (
                    <tr key={line.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{line.sn}</td>
                      <td className="px-3 py-2 font-mono text-[11px]">
                        {line.contract}
                      </td>
                      <td className="px-3 py-2">{line.clientName}</td>
                      <td className="px-3 py-2">{line.typeLivestock}</td>
                      <td className="px-3 py-2">{line.branch}</td>
                      <td className="px-3 py-2">{formatRwf(line.sumInsured)}</td>
                      <td className="px-3 py-2">{formatRwf(line.netPremium)}</td>
                      <td className="px-3 py-2 font-medium">
                        {formatRwf(line.commission)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {footer ? (
          <div className="border-t border-slate-200 px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-900 break-all">{value}</p>
    </div>
  );
}
