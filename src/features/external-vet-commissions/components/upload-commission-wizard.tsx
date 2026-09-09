'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Loader2,
  Search,
  Upload,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useExternalVetCommissionsApi } from '../api';
import {
  COMMISSION_LINE_COLUMN_KEYS,
  COMMISSION_LINE_COLUMN_LABELS,
  DEFAULT_COMPANY_COMMISSION_PERCENT,
  calcCompanyCommission,
  formatCommissionLineCell,
  formatRwf,
  type ExternalVet,
  type ExternalVetCommissionLine,
  type ExternalVetPayeeSnapshot,
  type PlatformVetSearchHit,
} from '../domain';
import type { ClaimFormLanguage } from '../commission-sheet-schema';
import { downloadCommissionClaimForm } from '../export/commission-sheet-template';
import {
  parseCommissionSheet,
  type ColumnMatch,
} from '../parse-commission-sheet';
import {
  emptyPayeeSnapshot,
  payeeFormComplete,
  VetPayeeFields,
} from './vet-payee-fields';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

type AssignMode = 'search' | 'new';

/** Digits only — used to collapse duplicate registry entries for the same person. */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * The registry can accumulate the same vet under multiple ids (re-uploads).
 * Prefer the first record for each unique phone, falling back to name+account.
 */
function dedupeExternalVets(vets: ExternalVet[]): ExternalVet[] {
  const seen = new Set<string>();
  const unique: ExternalVet[] = [];

  for (const vet of vets) {
    const phone = normalizePhone(vet.phoneNumber);
    const key = phone
      ? `p:${phone}`
      : `n:${vet.name.trim().toLowerCase()}|${normalizePhone(vet.bankAccountNumber ?? '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(vet);
  }

  return unique;
}

function dedupePlatformHits(hits: PlatformVetSearchHit[]): PlatformVetSearchHit[] {
  const seen = new Set<string>();
  const unique: PlatformVetSearchHit[] = [];

  for (const hit of hits) {
    const phone = normalizePhone(hit.phoneNumber ?? '');
    const key =
      hit.userId ||
      (phone ? `p:${phone}` : `n:${hit.fullName.trim().toLowerCase()}`);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(hit);
  }

  return unique;
}

const PREVIEW_MONO_KEYS = new Set([
  'sn',
  'microchipNumber',
  'contract',
  'clientId',
]);

const PREVIEW_MONEY_KEYS = new Set([
  'sumInsured',
  'netPremium',
  'vetCommission',
  'companyCommission',
]);

export function UploadCommissionWizard({ open, onClose, onCreated }: Props) {
  const api = useExternalVetCommissionsApi();
  const { showToast, ToastContainer } = useToast();

  // 1 = vet form, 2 = upload lines sheet, 3 = confirm
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [periodLabel, setPeriodLabel] = useState('');
  const [companyCommissionPercent, setCompanyCommissionPercent] = useState(
    DEFAULT_COMPANY_COMMISSION_PERCENT,
  );
  const [sheetLines, setSheetLines] = useState<
    Omit<ExternalVetCommissionLine, 'id'>[]
  >([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [columnMatches, setColumnMatches] = useState<ColumnMatch[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<
    ClaimFormLanguage | undefined
  >();
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templateBusy, setTemplateBusy] = useState<ClaimFormLanguage | null>(
    null,
  );

  const [externalVets, setExternalVets] = useState<ExternalVet[]>([]);
  const [platformHits, setPlatformHits] = useState<PlatformVetSearchHit[]>([]);
  const [isLoadingVets, setIsLoadingVets] = useState(false);
  const [isSearchingPlatform, setIsSearchingPlatform] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignMode, setAssignMode] = useState<AssignMode>('new');
  const [selectedExternalVetId, setSelectedExternalVetId] = useState<
    string | null
  >(null);
  const [linkedUserId, setLinkedUserId] = useState<string | undefined>();
  const [payee, setPayee] = useState<ExternalVetPayeeSnapshot>(emptyPayeeSnapshot);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoadingVets(true);
    void api
      .listExternalVets()
      .then((rows) => {
        if (!cancelled) setExternalVets(dedupeExternalVets(rows));
      })
      .catch(() => {
        if (!cancelled) {
          setExternalVets([]);
          showToast('Could not load external vets', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingVets(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, open, showToast]);

  useEffect(() => {
    if (!open || assignMode !== 'search') return;
    let cancelled = false;
    const handle = setTimeout(() => {
      setIsSearchingPlatform(true);
      void api
        .searchPlatformVets(searchQuery)
        .then((rows) => {
          if (!cancelled) setPlatformHits(dedupePlatformHits(rows));
        })
        .catch(() => {
          if (!cancelled) setPlatformHits([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearchingPlatform(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [api, assignMode, open, searchQuery]);

  const lines = useMemo(
    () =>
      sheetLines.map((line) => ({
        ...line,
        companyCommission: calcCompanyCommission(
          line.netPremium,
          companyCommissionPercent,
        ),
      })),
    [sheetLines, companyCommissionPercent],
  );

  const totalCompanyCommission = useMemo(
    () => lines.reduce((sum, l) => sum + l.companyCommission, 0),
    [lines],
  );

  const totalVetCommission = useMemo(
    () => lines.reduce((sum, l) => sum + l.vetCommission, 0),
    [lines],
  );

  const totalNetPremium = useMemo(
    () => lines.reduce((sum, l) => sum + l.netPremium, 0),
    [lines],
  );

  if (!open) return null;

  async function handleDownloadTemplate(language: ClaimFormLanguage) {
    setTemplateBusy(language);
    try {
      await downloadCommissionClaimForm(language);
      showToast('Claim form downloaded', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to download claim form',
        'error',
      );
    } finally {
      setTemplateBusy(null);
    }
  }

  async function handleParseAndContinue() {
    if (!file) {
      showToast('Choose an Excel or CSV file first', 'error');
      return;
    }
    setIsParsing(true);
    try {
      const result = await parseCommissionSheet(file);
      setParseErrors(result.errors);
      setParseWarnings(result.warnings);
      setColumnMatches(result.columnMatches);
      setDetectedLanguage(result.detectedLanguage);
      setSheetLines(result.lines);
      if (result.errors.length) {
        showToast(result.errors[0], 'error');
        return;
      }
      if (!periodLabel.trim()) {
        if (result.periodLabel) setPeriodLabel(result.periodLabel);
      }
      setStep(3);
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
      district: vet.district ?? '',
      sector: vet.sector ?? '',
      commissionRequestDate:
        payee.commissionRequestDate || new Date().toISOString().slice(0, 10),
      bankName: vet.bankName ?? '',
      bankAccountNumber: vet.bankAccountNumber ?? '',
    });
    setAssignMode('search');
  }

  function selectPlatformVet(hit: PlatformVetSearchHit) {
    setSelectedExternalVetId(null);
    setLinkedUserId(hit.userId);
    setPayee({
      name: hit.fullName,
      phoneNumber: hit.phoneNumber ?? '',
      district: '',
      sector: '',
      commissionRequestDate:
        payee.commissionRequestDate || new Date().toISOString().slice(0, 10),
      bankName: hit.bankName ?? '',
      bankAccountNumber: hit.bankAccountNumber ?? '',
    });
    setAssignMode('new');
  }

  async function handleSubmit() {
    if (!file || !lines.length) {
      showToast('Upload and parse a commission sheet first', 'error');
      return;
    }
    if (
      !Number.isFinite(companyCommissionPercent) ||
      companyCommissionPercent < 0 ||
      companyCommissionPercent > 100
    ) {
      showToast('Company commission % must be between 0 and 100', 'error');
      return;
    }
    if (!payeeFormComplete(payee, periodLabel)) {
      showToast(
        'Complete vet details: name, district, sector, phone, request date, and period',
        'error',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      let externalVetId = selectedExternalVetId?.trim() || '';
      if (!externalVetId) {
        const created = await api.createExternalVet({
          name: payee.name,
          phoneNumber: payee.phoneNumber,
          district: payee.district || undefined,
          sector: payee.sector || undefined,
          bankName: payee.bankName || undefined,
          bankAccountNumber: payee.bankAccountNumber || undefined,
          linkedUserId,
        });
        externalVetId = created.id?.trim() || '';
        if (!externalVetId) {
          throw new Error(
            'External vet was created but no id was returned. Cannot create batch.',
          );
        }
        setSelectedExternalVetId(externalVetId);
      }

      await api.createBatch({
        externalVetId,
        payee: {
          name: payee.name.trim(),
          phoneNumber: payee.phoneNumber.trim(),
          district: payee.district.trim(),
          sector: payee.sector.trim(),
          commissionRequestDate: payee.commissionRequestDate.trim(),
          bankName: payee.bankName?.trim() || undefined,
          bankAccountNumber: payee.bankAccountNumber?.trim() || undefined,
        },
        periodLabel: periodLabel.trim(),
        sourceFileName: file.name,
        sourceFile: file,
        companyCommissionPercent,
        lines,
      });

      showToast('Commission batch submitted for admin review', 'success');
      // Brief delay so the success toast can paint before the modal unmounts.
      await new Promise((resolve) => setTimeout(resolve, 400));
      resetAndClose(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create batch';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetAndClose(created: boolean) {
    setStep(1);
    setFile(null);
    setPeriodLabel('');
    setCompanyCommissionPercent(DEFAULT_COMPANY_COMMISSION_PERCENT);
    setSheetLines([]);
    setParseErrors([]);
    setParseWarnings([]);
    setColumnMatches([]);
    setDetectedLanguage(undefined);
    setSelectedExternalVetId(null);
    setLinkedUserId(undefined);
    setPayee(emptyPayeeSnapshot());
    setAssignMode('new');
    setSearchQuery('');
    setPlatformHits([]);
    onClose();
    if (created) onCreated();
  }

  const filteredRegistry = externalVets.filter((v) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      v.name.toLowerCase().includes(q) ||
      v.phoneNumber.includes(q) ||
      (v.bankAccountNumber ?? '').includes(q)
    );
  });

  const stepLabel =
    step === 1
      ? 'Vet payout details'
      : step === 2
        ? 'Upload commission lines'
        : 'Confirm & submit';

  const previewRows = lines.slice(0, 20);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <ToastContainer />
      <div className="flex max-h-[90vh] w-full max-w-[min(96rem,96vw)] flex-col rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            New external vet commission batch
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Step {step} of 3 — {stepLabel}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Vet payout details are entered in this form. The uploaded claim form
            supplies the contract lines, and company commission is calculated
            from net premium × the rate you set (default{' '}
            {DEFAULT_COMPANY_COMMISSION_PERCENT}%).
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={assignMode === 'new' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setAssignMode('new');
                    setSelectedExternalVetId(null);
                    setLinkedUserId(undefined);
                  }}
                >
                  <UserPlus className="mr-1 h-3.5 w-3.5" />
                  New external vet
                </Button>
                <Button
                  variant={assignMode === 'search' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setAssignMode('search')}
                >
                  <Search className="mr-1 h-3.5 w-3.5" />
                  Search existing
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
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          External registry
                        </p>
                        {isLoadingVets ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {filteredRegistry.length} unique
                          </span>
                        )}
                      </div>
                      <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-1.5">
                        {isLoadingVets ? (
                          <div className="flex items-center justify-center gap-2 px-2 py-8 text-xs text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Fetching external vets…
                          </div>
                        ) : (
                          <>
                            {filteredRegistry.map((vet) => (
                              <button
                                key={vet.id}
                                type="button"
                                onClick={() => selectExternalVet(vet)}
                                className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                                  selectedExternalVetId === vet.id
                                    ? 'bg-sky-50 ring-1 ring-sky-300'
                                    : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="font-medium text-slate-900">
                                  {vet.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {vet.phoneNumber}
                                  {vet.bankName ? ` · ${vet.bankName}` : ''}
                                </div>
                              </button>
                            ))}
                            {!filteredRegistry.length ? (
                              <p className="px-2 py-3 text-xs text-slate-500">
                                No registry matches
                              </p>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Platform vets
                        </p>
                        {isSearchingPlatform ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Searching
                          </span>
                        ) : null}
                      </div>
                      <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-1.5">
                        {isSearchingPlatform && !platformHits.length ? (
                          <div className="flex items-center justify-center gap-2 px-2 py-8 text-xs text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Searching platform vets…
                          </div>
                        ) : (
                          <>
                            {platformHits.map((hit) => (
                              <button
                                key={hit.userId}
                                type="button"
                                onClick={() => selectPlatformVet(hit)}
                                className="block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
                              >
                                <div className="font-medium text-slate-900">
                                  {hit.fullName}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {hit.phoneNumber || '—'} · {hit.email || '—'}
                                </div>
                              </button>
                            ))}
                            {!platformHits.length && !isSearchingPlatform ? (
                              <p className="px-2 py-3 text-xs text-slate-500">
                                {searchQuery.trim()
                                  ? 'No platform matches'
                                  : 'Type to search platform vets'}
                              </p>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              <VetPayeeFields
                payee={payee}
                onChange={setPayee}
                periodLabel={periodLabel}
                onPeriodLabelChange={setPeriodLabel}
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Official livestock commission claim form
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Upload the filled claim form in Kinyarwanda or English.
                      Only the table under section 2 (&ldquo;URUTONDE
                      RW&rsquo;AMATUNGO&rdquo; / &ldquo;LIST OF
                      CONTRACTS&rdquo;) is read, up to the TOTAL / IGITERANYO
                      row — the identification and signature blocks are ignored.
                      Empty rows are skipped, and company commission is
                      calculated from the rate below.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleDownloadTemplate('rw')}
                    disabled={templateBusy != null}
                  >
                    {templateBusy === 'rw' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Ifishi (Kinyarwanda)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDownloadTemplate('en')}
                    disabled={templateBusy != null}
                  >
                    {templateBusy === 'en' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    English form
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Company commission %{' '}
                    <span className="font-normal text-slate-400">
                      (of net premium)
                    </span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm"
                      value={companyCommissionPercent}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setCompanyCommissionPercent(
                          Number.isFinite(next) ? next : 0,
                        );
                      }}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      %
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Default {DEFAULT_COMPANY_COMMISSION_PERCENT}%. Each line’s
                    CompanyCommission = NetPremium × this rate.
                  </p>
                </div>
              </div>

              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white px-6 py-10 hover:border-slate-400">
                <Upload className="mb-2 h-8 w-8 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">
                  {file ? file.name : 'Choose .xlsx, .xls, or .csv'}
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  Lines for {payee.name || 'selected vet'}
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setParseErrors([]);
                    setSheetLines([]);
                  }}
                />
              </label>

              {parseErrors.length ? (
                <ul className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {parseErrors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-800">Vet (from form)</p>
                <p className="mt-1">
                  <strong>{payee.name}</strong> · {payee.phoneNumber}
                </p>
                <p className="text-slate-600">
                  {[payee.district, payee.sector]
                    .map((v) => (v ?? '').trim())
                    .filter(Boolean)
                    .join(' · ') || '—'}
                  {payee.commissionRequestDate
                    ? ` · Request ${payee.commissionRequestDate}`
                    : ''}
                </p>
                {((payee.bankName ?? '').trim() ||
                  (payee.bankAccountNumber ?? '').trim()) && (
                  <p>
                    {[payee.bankName, payee.bankAccountNumber]
                      .map((v) => (v ?? '').trim())
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                <p className="mt-1 text-slate-600">
                  Period <strong>{periodLabel || '—'}</strong>
                </p>
                <p className="mt-3 font-semibold text-slate-800">
                  Sheet &amp; company commission
                </p>
                <p className="mt-1">
                  {file?.name} · {lines.length} lines · rate{' '}
                  <strong>{companyCommissionPercent}%</strong>
                  {periodLabel ? ` · ${periodLabel}` : ''}
                </p>
                <p className="mt-1 text-slate-600">
                  Net premium {formatRwf(totalNetPremium)} · Vet commission{' '}
                  <strong>{formatRwf(totalVetCommission)}</strong> · Company
                  commission{' '}
                  <strong>{formatRwf(totalCompanyCommission)}</strong>
                </p>
                <div className="mt-3 max-w-xs">
                  <label className="text-xs font-medium text-slate-600">
                    Adjust company commission %
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-8 text-sm"
                      value={companyCommissionPercent}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setCompanyCommissionPercent(
                          Number.isFinite(next) ? next : 0,
                        );
                      }}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      %
                    </span>
                  </div>
                </div>
              </div>
              {columnMatches.length ? (
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      Detected columns
                    </p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {detectedLanguage === 'rw'
                        ? 'Kinyarwanda form'
                        : detectedLanguage === 'en'
                          ? 'English form'
                          : 'Custom headers'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Every column below is stored in English regardless of the
                    uploaded language.
                  </p>
                  <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {columnMatches.map((match) => (
                      <li
                        key={match.field}
                        className="flex flex-wrap items-baseline gap-x-1.5 text-xs"
                      >
                        <span className="text-slate-500">
                          {match.sourceHeader.replace(/\s+/g, ' ').trim() ||
                            '(blank header)'}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className="font-medium text-slate-800">
                          {match.label}
                        </span>
                        {match.method !== 'exact' ? (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                              match.method === 'position'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {match.method === 'position'
                              ? 'by position'
                              : 'close match'}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {parseWarnings.length ? (
                <ul className="space-y-1 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {parseWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              ) : null}

              <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-2.5">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Commission lines preview
                    </p>
                    <p className="text-xs text-slate-500">
                      Showing {previewRows.length} of {lines.length} row
                      {lines.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div className="max-h-[28rem] overflow-auto">
                  <table className="min-w-max w-full border-separate border-spacing-0 text-left text-[12px]">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        {COMMISSION_LINE_COLUMN_KEYS.map((key) => (
                          <th
                            key={key}
                            className="whitespace-nowrap border-b border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                          >
                            {COMMISSION_LINE_COLUMN_LABELS[key]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((line, idx) => (
                        <tr
                          key={`${line.contract}-${line.clientId}-${idx}`}
                          className={
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                          }
                        >
                          {COMMISSION_LINE_COLUMN_KEYS.map((key) => (
                            <td
                              key={key}
                              className={`whitespace-nowrap border-b border-slate-100 px-3 py-2 text-slate-800 ${
                                PREVIEW_MONO_KEYS.has(key)
                                  ? 'font-mono text-[11px] tracking-tight'
                                  : ''
                              } ${
                                PREVIEW_MONEY_KEYS.has(key)
                                  ? 'text-right font-medium tabular-nums'
                                  : ''
                              }`}
                            >
                              {formatCommissionLineCell(line, key) || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {lines.length > 20 ? (
                  <p className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                    First 20 rows shown — all {lines.length} will be submitted.
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
            <Button
              onClick={() => setStep(2)}
              disabled={!payeeFormComplete(payee, periodLabel)}
            >
              Continue to upload
            </Button>
          ) : null}
          {step === 2 ? (
            <Button
              onClick={() => void handleParseAndContinue()}
              disabled={isParsing || !file}
            >
              {isParsing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Parse & review
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
