'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileUp,
  Loader2,
  PencilLine,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReviewSonarwaSubsidyPayload } from '@/features/livestock-application/api/commission-workflow-api';

type ReviewMode = 'approve' | 'approve_with_changes';

interface SonarwaSubsidyReviewModalProps {
  open: boolean;
  onClose: () => void;
  applicationNumber: string;
  ownerSummary: string;
  signedDocumentUrl?: string;
  skipSectorReason?: string;
  /** Current vet commission shown as reference when adjusting. */
  currentVeterinaryCommission?: number;
  onSubmit: (payload: ReviewSonarwaSubsidyPayload) => Promise<void>;
  onViewDocument?: (name: string, path: string) => void;
}

export function SonarwaSubsidyReviewModal({
  open,
  onClose,
  applicationNumber,
  ownerSummary,
  signedDocumentUrl,
  skipSectorReason,
  currentVeterinaryCommission,
  onSubmit,
  onViewDocument,
}: SonarwaSubsidyReviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<ReviewMode>('approve');
  const [changeComment, setChangeComment] = useState('');
  const [updatedCommission, setUpdatedCommission] = useState('');
  const [correctionDocument, setCorrectionDocument] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setMode('approve');
    setChangeComment('');
    setUpdatedCommission(
      currentVeterinaryCommission != null && Number.isFinite(currentVeterinaryCommission)
        ? String(currentVeterinaryCommission)
        : '',
    );
    setCorrectionDocument(null);
    setFormError(null);
    setIsSubmitting(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, currentVeterinaryCommission]);

  if (!mounted || !open) return null;

  const handleSubmit = async () => {
    if (mode === 'approve') {
      setFormError(null);
      setIsSubmitting(true);
      try {
        await onSubmit({ action: 'approve' });
        onClose();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Could not complete SONARWA review.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const commissionValue = Number(updatedCommission);
    if (!correctionDocument) {
      setFormError('Upload the corrected document that excludes fraudulent or incorrect information.');
      return;
    }
    if (!Number.isFinite(commissionValue) || commissionValue < 0) {
      setFormError('Enter a valid updated veterinary commission amount (RWF).');
      return;
    }
    if (!changeComment.trim()) {
      setFormError('Add a comment explaining the changes.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        action: 'approve_with_changes',
        correctionDocument,
        updatedVeterinaryCommission: commissionValue,
        changeComment: changeComment.trim(),
      });
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not complete SONARWA review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-[var(--sonarwa-primary)]">SONARWA review</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{applicationNumber}</h3>
            <p className="text-sm text-slate-600">{ownerSummary}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {skipSectorReason ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <p className="font-medium">Sector nkunganire skipped</p>
              <p className="mt-1 text-xs">{skipSectorReason}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              Approve as submitted, or approve with changes when the evidence needs a corrected
              document and an adjusted veterinary commission.
            </p>
          )}

          {signedDocumentUrl && onViewDocument && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onViewDocument('Nkunganire (signed)', signedDocumentUrl)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View signed document
            </Button>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode('approve')}
              className={`cursor-pointer rounded-xl border px-3 py-3 text-left transition ${
                mode === 'approve'
                  ? 'border-[var(--sonarwa-primary)] bg-[var(--sonarwa-soft)]'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-[var(--sonarwa-primary)]" />
                Approve
              </p>
              <p className="mt-1 text-xs text-slate-600">No changes — continue to admin review.</p>
            </button>
            <button
              type="button"
              onClick={() => setMode('approve_with_changes')}
              className={`cursor-pointer rounded-xl border px-3 py-3 text-left transition ${
                mode === 'approve_with_changes'
                  ? 'border-[var(--sonarwa-primary)] bg-[var(--sonarwa-soft)]'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <PencilLine className="h-4 w-4 text-[var(--sonarwa-primary)]" />
                Approve with changes
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Upload corrected evidence and set the vet commission.
              </p>
            </button>
          </div>

          {mode === 'approve_with_changes' && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              {currentVeterinaryCommission != null && (
                <p className="text-xs text-slate-600">
                  Current veterinary commission:{' '}
                  <span className="font-semibold text-slate-900">
                    {currentVeterinaryCommission.toLocaleString()} RWF
                  </span>
                </p>
              )}

              <div>
                <label
                  htmlFor="sonarwa-updated-commission"
                  className="text-sm font-medium text-slate-700"
                >
                  Updated veterinary commission (RWF)
                </label>
                <input
                  id="sonarwa-updated-commission"
                  type="number"
                  min={0}
                  step={1}
                  value={updatedCommission}
                  onChange={(e) => setUpdatedCommission(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[var(--sonarwa-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--sonarwa-soft)]"
                  placeholder="Amount the veterinarian should receive"
                />
              </div>

              <div>
                <label
                  htmlFor="sonarwa-correction-document"
                  className="text-sm font-medium text-slate-700"
                >
                  Corrected document
                </label>
                <label
                  htmlFor="sonarwa-correction-document"
                  className="mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-center hover:border-[var(--sonarwa-primary)]"
                >
                  <FileUp className="h-5 w-5 text-slate-500" />
                  <span className="text-sm font-medium text-slate-800">
                    {correctionDocument?.name || 'Upload PDF or image'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Corrected information only — exclude fraudulent content
                  </span>
                  <input
                    id="sonarwa-correction-document"
                    type="file"
                    accept=".pdf,image/*"
                    className="sr-only"
                    onChange={(e) => setCorrectionDocument(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div>
                <label htmlFor="sonarwa-change-comment" className="text-sm font-medium text-slate-700">
                  Comment for the change
                </label>
                <textarea
                  id="sonarwa-change-comment"
                  rows={3}
                  value={changeComment}
                  onChange={(e) => setChangeComment(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[var(--sonarwa-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--sonarwa-soft)]"
                  placeholder="Explain what was corrected and why the commission changed…"
                />
              </div>
            </div>
          )}

          {formError && (
            <p className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {formError}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="text" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={isSubmitting} onClick={() => void handleSubmit()}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : mode === 'approve' ? (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            ) : (
              <PencilLine className="mr-2 h-4 w-4" />
            )}
            {mode === 'approve' ? 'Approve' : 'Approve with changes'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
