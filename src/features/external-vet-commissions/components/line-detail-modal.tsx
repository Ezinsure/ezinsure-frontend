'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  COMMISSION_LINE_COLUMN_KEYS,
  COMMISSION_LINE_COLUMN_LABELS,
  calcBillableToSonarwa,
  calcTotalCommission,
  formatCommissionLineCell,
  formatRwf,
  type ExternalVetCommissionLineListItem,
} from '../domain';
import { ExternalVetStatusBadge } from './status-badge';

type Props = {
  line: ExternalVetCommissionLineListItem;
  onClose: () => void;
};

export function LineDetailModal({ line, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="line-detail-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Commission line
            </p>
            <h2
              id="line-detail-title"
              className="mt-1 truncate text-lg font-semibold text-slate-900"
            >
              {line.contract || line.clientName || `Line ${line.sn}`}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ExternalVetStatusBadge status={line.batchStatus} />
              <span className="text-sm text-slate-600">{line.batchNumber}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <section className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              External vet
            </h3>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-slate-500">Name</dt>
                <dd className="font-medium text-slate-900">
                  {line.payee?.name || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-900">
                  {line.payee?.phoneNumber || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">District</dt>
                <dd className="font-medium text-slate-900">
                  {line.payee?.district || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Sector</dt>
                <dd className="font-medium text-slate-900">
                  {line.payee?.sector || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Request date</dt>
                <dd className="font-medium text-slate-900">
                  {line.payee?.commissionRequestDate || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Bank</dt>
                <dd className="font-medium text-slate-900">
                  {line.payee?.bankName || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Account</dt>
                <dd className="font-medium text-slate-900">
                  {line.payee?.bankAccountNumber || '—'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Net premium
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatRwf(line.netPremium)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Vet commission
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatRwf(line.vetCommission)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Company commission
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatRwf(line.companyCommission)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Total + VAT (18%)
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatRwf(
                  calcBillableToSonarwa(
                    calcTotalCommission(
                      line.vetCommission,
                      line.companyCommission,
                    ),
                  ),
                )}
              </p>
            </div>
          </section>

          <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            {COMMISSION_LINE_COLUMN_KEYS.map((key) => (
              <div key={key}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {COMMISSION_LINE_COLUMN_LABELS[key]}
                </dt>
                <dd className="mt-0.5 text-sm text-slate-900">
                  {formatCommissionLineCell(line, key)}
                </dd>
              </div>
            ))}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Period
              </dt>
              <dd className="mt-0.5 text-sm text-slate-900">
                {line.periodLabel || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Paid at
              </dt>
              <dd className="mt-0.5 text-sm text-slate-900">
                {line.paidAt
                  ? new Date(line.paidAt).toLocaleString()
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-5 py-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
