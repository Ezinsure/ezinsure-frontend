'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, PawPrint, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InsuredLineDetailModal } from '@/features/livestock-application/components/modals/insured-line-detail-modal';
import type {
  InsuredLinePayload,
  LivestockApplicationPackage,
} from '@/features/livestock-application/domain/application-types';
import {
  isPoultryApplication,
  lineSecondaryLabel,
  lineTableLabel,
  ownerLineKey,
} from '@/features/livestock-application/utils/insured-line-display';
import { formatRwfDisplay } from '@/features/livestock-application/utils/format-rwf';

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

interface InsuredLinesSectionProps {
  application: LivestockApplicationPackage;
  ownerFilterKey?: string | null;
  linesUnavailableNote?: string;
}

export function InsuredLinesSection({
  application,
  ownerFilterKey = null,
  linesUnavailableNote,
}: InsuredLinesSectionProps) {
  const { lines, speciesGroup, ownerMode } = application;
  const isPoultry = isPoultryApplication(application);
  const isMultiOwner = ownerMode === 'MULTI_OWNER';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [detailLine, setDetailLine] = useState<{ line: InsuredLinePayload; index: number } | null>(
    null,
  );

  const filteredLines = useMemo(() => {
    const withIndex = lines.map((line, lineIndex) => ({ line, lineIndex }));
    const result = ownerFilterKey
      ? withIndex.filter(({ line }) => {
          if (ownerFilterKey === 'primary') return true;
          return ownerLineKey(line) === ownerFilterKey;
        })
      : withIndex;
    const q = search.trim().toLowerCase();
    if (!q) return result;
    return result.filter(({ line, lineIndex }) => {
      const haystack = [
        lineTableLabel(line, lineIndex),
        lineSecondaryLabel(line),
        line.owner?.name,
        line.owner?.phone,
        line.animal.chipNumber,
        line.animal.breed,
        line.animal.hatcherySource,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [lines, ownerFilterKey, search]);

  const totalPages = Math.max(1, Math.ceil(filteredLines.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageLines = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLines.slice(start, start + pageSize);
  }, [filteredLines, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [ownerFilterKey, search, pageSize]);

  const summary = useMemo(
    () => ({
      count: filteredLines.length,
      totalSumAssured: filteredLines.reduce((s, { line }) => s + line.sumAssured, 0),
      totalPremium: filteredLines.reduce((s, { line }) => s + line.premiumRate, 0),
    }),
    [filteredLines],
  );

  const globalIndex = (localIndex: number) => (safePage - 1) * pageSize + localIndex;

  if (lines.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-50 p-3">
            <PawPrint className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Insured animals & lots</h2>
            <p className="mt-2 text-sm text-slate-600">
              {linesUnavailableNote ??
                'No insured lines are available for this application yet.'}
            </p>
            <dl className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase text-slate-400">Package value</dt>
                <dd className="font-semibold text-slate-900">
                  {formatRwfDisplay(application.totals.totalSumAssured)}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase text-slate-400">Total premium</dt>
                <dd className="font-semibold text-slate-900">
                  {formatRwfDisplay(application.totals.premiumRateAmount)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-50 p-3">
                <PawPrint className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Insured animals & lots</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {summary.count} line{summary.count !== 1 ? 's' : ''} · {speciesGroup.replace(/_/g, ' ')}
                  {ownerFilterKey ? ' · filtered by owner' : ''}
                </p>
              </div>
            </div>
            <dl className="flex flex-wrap gap-4 text-sm">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase text-slate-400">Total value</dt>
                <dd className="font-semibold text-slate-900">{formatRwfDisplay(summary.totalSumAssured)}</dd>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase text-slate-400">Total premium</dt>
                <dd className="font-semibold text-slate-900">{formatRwfDisplay(summary.totalPremium)}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[12rem] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search eartag, breed, owner…"
                className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Rows
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[48rem] w-full text-sm">
            <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">{isPoultry ? 'Lot / hatchery' : 'Eartag'}</th>
                {isMultiOwner && <th className="px-4 py-3">Owner</th>}
                <th className="px-4 py-3">{isPoultry ? 'Quantity' : 'Breed / type'}</th>
                <th className="px-4 py-3">Sum assured</th>
                <th className="px-4 py-3">Premium</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageLines.length === 0 ? (
                <tr>
                  <td colSpan={isMultiOwner ? 7 : 6} className="px-4 py-12 text-center text-slate-500">
                    No lines match your search.
                  </td>
                </tr>
              ) : (
                pageLines.map(({ line, lineIndex }, localIdx) => {
                  const idx = globalIndex(localIdx);
                  return (
                    <tr key={`${line.animal.chipNumber ?? lineIndex}-${lineIndex}`} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{lineTableLabel(line, lineIndex)}</p>
                        <p className="text-xs text-slate-500">{line.animal.species}</p>
                      </td>
                      {isMultiOwner && (
                        <td className="px-4 py-3 text-slate-700">
                          <p>{line.owner?.name || '—'}</p>
                          {line.owner?.phone && (
                            <p className="text-xs text-slate-500">{line.owner.phone}</p>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-700">
                        {isPoultry ? line.quantity : lineSecondaryLabel(line)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {formatRwfDisplay(line.sumAssured)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatRwfDisplay(line.premiumRate)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailLine({ line, index: lineIndex })}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredLines.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 text-sm text-slate-600">
            <p>
              Showing {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, filteredLines.length)} of {filteredLines.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[5rem] text-center font-medium">
                Page {safePage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>

      <InsuredLineDetailModal
        open={detailLine !== null}
        line={detailLine?.line ?? null}
        lineIndex={detailLine?.index ?? 0}
        onClose={() => setDetailLine(null)}
      />
    </>
  );
}
