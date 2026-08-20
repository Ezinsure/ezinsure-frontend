'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Upload, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useExternalVetCommissionsApi } from '../api';
import {
  COMMISSION_LINE_COLUMN_KEYS,
  COMMISSION_LINE_COLUMN_LABELS,
  formatCommissionLineCell,
  formatRwf,
  type ExternalVet,
  type ExternalVetCommissionLine,
  type ExternalVetPayeeSnapshot,
  type PlatformVetSearchHit,
} from '../domain';
import { parseCommissionSheet } from '../parse-commission-sheet';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

type AssignMode = 'search' | 'new';

export function UploadCommissionWizard({ open, onClose, onCreated }: Props) {
  const api = useExternalVetCommissionsApi();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [periodLabel, setPeriodLabel] = useState('');
  const [lines, setLines] = useState<Omit<ExternalVetCommissionLine, 'id'>[]>(
    [],
  );
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [externalVets, setExternalVets] = useState<ExternalVet[]>([]);
  const [platformHits, setPlatformHits] = useState<PlatformVetSearchHit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignMode, setAssignMode] = useState<AssignMode>('search');
  const [selectedExternalVetId, setSelectedExternalVetId] = useState<
    string | null
  >(null);
  const [linkedUserId, setLinkedUserId] = useState<string | undefined>();
  const [payee, setPayee] = useState<ExternalVetPayeeSnapshot>({
    name: '',
    phoneNumber: '',
    bankName: '',
    bankAccountNumber: '',
  });

  useEffect(() => {
    if (!open) return;
    void api.listExternalVets().then(setExternalVets);
  }, [api, open]);

  useEffect(() => {
    if (!open || assignMode !== 'search') return;
    const handle = setTimeout(() => {
      void api.searchPlatformVets(searchQuery).then(setPlatformHits);
    }, 250);
    return () => clearTimeout(handle);
  }, [api, assignMode, open, searchQuery]);

  const totalCommission = useMemo(
    () => lines.reduce((sum, l) => sum + l.commission, 0),
    [lines],
  );

  if (!open) return null;

  async function handleParse() {
    if (!file) {
      showToast('Choose an Excel or CSV file first', 'error');
      return;
    }
    setIsParsing(true);
    try {
      const result = await parseCommissionSheet(file);
      setParseErrors(result.errors);
      setParseWarnings(result.warnings);
      setLines(result.lines);
      if (result.errors.length) {
        showToast(result.errors[0], 'error');
        return;
      }
      if (!periodLabel.trim()) {
        const guess = file.name.replace(/\.(xlsx|xls|csv)$/i, '').replace(/_/g, ' ');
        setPeriodLabel(guess);
      }
      setStep(2);
    } finally {
      setIsParsing(false);
    }
  }

  function selectExternalVet(vet: ExternalVet) {
    setSelectedExternalVetId(vet.id);
    setLinkedUserId(vet.linkedUserId);
    setPayee({
      name: vet.name,
      phoneNumber: vet.phoneNumber,
      bankName: vet.bankName,
      bankAccountNumber: vet.bankAccountNumber,
    });
    setAssignMode('search');
  }

  function selectPlatformVet(hit: PlatformVetSearchHit) {
    setSelectedExternalVetId(null);
    setLinkedUserId(hit.userId);
    setPayee({
      name: hit.fullName,
      phoneNumber: hit.phoneNumber ?? '',
      bankName: hit.bankName ?? '',
      bankAccountNumber: hit.bankAccountNumber ?? '',
    });
    setAssignMode('new');
  }

  async function handleSubmit() {
    if (!file || !lines.length) return;
    if (
      !payee.name.trim() ||
      !payee.phoneNumber.trim() ||
      !payee.bankName.trim() ||
      !payee.bankAccountNumber.trim()
    ) {
      showToast('Fill all vet payout fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let externalVetId = selectedExternalVetId;
      if (!externalVetId) {
        const created = await api.createExternalVet({
          name: payee.name,
          phoneNumber: payee.phoneNumber,
          bankName: payee.bankName,
          bankAccountNumber: payee.bankAccountNumber,
          linkedUserId,
        });
        externalVetId = created.id;
      }

      await api.createBatch({
        externalVetId,
        payee,
        periodLabel: periodLabel.trim() || undefined,
        sourceFileName: file.name,
        lines,
      });

      showToast('Commission batch submitted for admin review', 'success');
      resetAndClose(true);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to create batch',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetAndClose(created: boolean) {
    setStep(1);
    setFile(null);
    setPeriodLabel('');
    setLines([]);
    setParseErrors([]);
    setParseWarnings([]);
    setSelectedExternalVetId(null);
    setLinkedUserId(undefined);
    setPayee({
      name: '',
      phoneNumber: '',
      bankName: '',
      bankAccountNumber: '',
    });
    setAssignMode('search');
    setSearchQuery('');
    onClose();
    if (created) onCreated();
  }

  const filteredRegistry = externalVets.filter((v) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      v.name.toLowerCase().includes(q) ||
      v.phoneNumber.includes(q) ||
      v.bankAccountNumber.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-[min(96rem,96vw)] flex-col rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Upload external vet commission sheet
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Step {step} of 3 —{' '}
            {step === 1
              ? 'Upload Excel'
              : step === 2
                ? 'Assign vet'
                : 'Confirm & submit'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 1 ? (
            <div className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 hover:border-slate-400">
                <Upload className="mb-2 h-8 w-8 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">
                  {file ? file.name : 'Choose .xlsx, .xls, or .csv'}
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Period label (optional)
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. UP MAY 2026"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                />
              </div>
              {parseErrors.length ? (
                <ul className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {parseErrors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={assignMode === 'search' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setAssignMode('search')}
                >
                  <Search className="mr-1 h-3.5 w-3.5" />
                  Search existing
                </Button>
                <Button
                  variant={assignMode === 'new' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setAssignMode('new');
                    setSelectedExternalVetId(null);
                  }}
                >
                  <UserPlus className="mr-1 h-3.5 w-3.5" />
                  New external vet
                </Button>
              </div>

              {assignMode === 'search' ? (
                <>
                  <input
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Search by name, phone, email…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                        External registry
                      </p>
                      <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-2">
                        {filteredRegistry.map((vet) => (
                          <button
                            key={vet.id}
                            type="button"
                            onClick={() => selectExternalVet(vet)}
                            className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                              selectedExternalVetId === vet.id
                                ? 'bg-sky-50 ring-1 ring-sky-300'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="font-medium">{vet.name}</div>
                            <div className="text-xs text-slate-500">
                              {vet.phoneNumber} · {vet.bankName}
                            </div>
                          </button>
                        ))}
                        {!filteredRegistry.length ? (
                          <p className="px-2 py-3 text-xs text-slate-500">
                            No registry matches
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                        Platform vets
                      </p>
                      <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-2">
                        {platformHits.map((hit) => (
                          <button
                            key={hit.userId}
                            type="button"
                            onClick={() => selectPlatformVet(hit)}
                            className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            <div className="font-medium">{hit.fullName}</div>
                            <div className="text-xs text-slate-500">
                              {hit.phoneNumber || '—'} · {hit.email || '—'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['name', 'Vet name'],
                    ['phoneNumber', 'Phone (TEL)'],
                    ['bankName', 'Bank'],
                    ['bankAccountNumber', 'Account number'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-slate-600">
                      {label}
                    </label>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={payee[key]}
                      onChange={(e) =>
                        setPayee((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <p>
                  <span className="text-slate-500">Vet:</span>{' '}
                  <strong>{payee.name}</strong> ({payee.phoneNumber})
                </p>
                <p>
                  <span className="text-slate-500">Bank:</span> {payee.bankName}{' '}
                  · {payee.bankAccountNumber}
                </p>
                <p>
                  <span className="text-slate-500">File:</span> {file?.name}
                </p>
                <p>
                  <span className="text-slate-500">Lines:</span> {lines.length} ·{' '}
                  <span className="text-slate-500">Total commission:</span>{' '}
                  <strong>{formatRwf(totalCommission)}</strong>
                </p>
              </div>
              {parseWarnings.length ? (
                <ul className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {parseWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              ) : null}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-max w-full text-left text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {COMMISSION_LINE_COLUMN_KEYS.map((key) => (
                        <th
                          key={key}
                          className="whitespace-nowrap px-3 py-2 font-medium"
                        >
                          {COMMISSION_LINE_COLUMN_LABELS[key]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.slice(0, 20).map((line, idx) => (
                      <tr key={`${line.contract}-${idx}`} className="border-t">
                        {COMMISSION_LINE_COLUMN_KEYS.map((key) => (
                          <td
                            key={key}
                            className={`whitespace-nowrap px-3 py-1.5 ${
                              key === 'contract' ? 'font-mono' : ''
                            }`}
                          >
                            {formatCommissionLineCell(line, key)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {lines.length > 20 ? (
                  <p className="border-t px-3 py-2 text-xs text-slate-500">
                    Showing 20 of {lines.length} rows
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 1) resetAndClose(false);
              else setStep((s) => (s === 3 ? 2 : 1));
            }}
            disabled={isSubmitting}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step === 1 ? (
            <Button onClick={() => void handleParse()} disabled={isParsing || !file}>
              {isParsing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Parse & continue
            </Button>
          ) : null}
          {step === 2 ? (
            <Button
              onClick={() => setStep(3)}
              disabled={
                !payee.name.trim() ||
                !payee.phoneNumber.trim() ||
                !payee.bankName.trim() ||
                !payee.bankAccountNumber.trim()
              }
            >
              Review
            </Button>
          ) : null}
          {step === 3 ? (
            <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Submit for review
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
