'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Eye, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReviewSonarwaSubsidyPayload } from '@/features/livestock-application/api/commission-workflow-api';

interface SonarwaSubsidyReviewModalProps {
  open: boolean;
  onClose: () => void;
  applicationNumber: string;
  ownerSummary: string;
  signedDocumentUrl?: string;
  skipSectorReason?: string;
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
  onSubmit,
  onViewDocument,
}: SonarwaSubsidyReviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setRejectionReason('');
    setFormError(null);
    setSubmittingAction(null);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const handleAction = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      setFormError('Please provide a reason for rejection.');
      return;
    }
    setFormError(null);
    setSubmittingAction(action);
    try {
      await onSubmit({
        action,
        rejectionReason: action === 'reject' ? rejectionReason.trim() : undefined,
      });
      onClose();
    } finally {
      setSubmittingAction(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-teal-800">SONARWA subsidy review</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{applicationNumber}</h3>
            <p className="text-sm text-slate-600">{ownerSummary}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
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
            <p className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs text-violet-900">
              Verify the sector-signed nkunganire document before approving commission review.
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

          <div>
            <label
              htmlFor="sonarwa-rejection-reason"
              className="text-sm font-medium text-slate-700"
            >
              Rejection reason (required if rejecting)
            </label>
            <textarea
              id="sonarwa-rejection-reason"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Explain what must be corrected on the nkunganire form…"
            />
          </div>

          {formError && (
            <p className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {formError}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="text" onClick={onClose} disabled={Boolean(submittingAction)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(submittingAction)}
            onClick={() => void handleAction('reject')}
          >
            {submittingAction === 'reject' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <AlertCircle className="mr-2 h-4 w-4" />
            )}
            Reject
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={Boolean(submittingAction)}
            onClick={() => void handleAction('approve')}
          >
            {submittingAction === 'approve' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Approve for commission
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
