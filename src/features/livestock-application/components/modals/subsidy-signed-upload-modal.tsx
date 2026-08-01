'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/file-input';
import type { UploadSignedSubsidyPayload } from '@/features/livestock-application/domain/application-types';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const EXT_PATTERN = /\.(jpe?g|png|pdf)$/i;

/** Vet upload only — SONARWA signing is recorded by the SONARWA portal review, not here. */
const SIGNED_BY_OPTIONS: Array<{ value: UploadSignedSubsidyPayload['signedBy']; label: string }> = [
  { value: 'SECTOR', label: 'Sector representative' },
  { value: 'VET', label: 'Sector veterinarian' },
];

interface SubsidySignedUploadModalProps {
  open: boolean;
  onClose: () => void;
  applicationNumber: string;
  existingDocumentUrl?: string;
  onSubmit: (payload: UploadSignedSubsidyPayload) => Promise<void>;
}

export function SubsidySignedUploadModal({
  open,
  onClose,
  applicationNumber,
  existingDocumentUrl,
  onSubmit,
}: SubsidySignedUploadModalProps) {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [signedBy, setSignedBy] = useState<UploadSignedSubsidyPayload['signedBy']>('SECTOR');
  const [notes, setNotes] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setSignedBy('SECTOR');
    setNotes('');
    setFileError(null);
    setFormError(null);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const handleFileChange = (next: File | null) => {
    if (next) {
      const mime = next.type?.toLowerCase();
      const name = next.name?.toLowerCase();
      const allowed =
        (mime && ALLOWED_TYPES.includes(mime)) || (!mime && EXT_PATTERN.test(name || ''));
      if (!allowed) {
        setFileError('Please upload JPG, JPEG, PNG or PDF.');
        setResetTrigger((n) => n + 1);
        setFile(null);
        return;
      }
    }
    setFileError(null);
    setFile(next);
  };

  const handleSubmit = async () => {
    if (!file) {
      setFormError('Signed subsidy document is required.');
      return;
    }
    if (!signedBy) {
      setFormError('Please select who signed the document.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({
        signedDocument: file,
        signedBy,
        notes: notes.trim() || undefined,
      });
      setFile(null);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not upload signed document.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Upload signed nkunganire document</h3>
        <p className="mt-1 text-sm text-slate-600">
          Application {applicationNumber} — scanned copy signed by the sector representative.
        </p>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs text-violet-900">
            Upload the fully signed nkunganire scan. The API expects{' '}
            <span className="font-medium">signedSubsidyDocument</span>,{' '}
            <span className="font-medium">signedBy</span>, and optional{' '}
            <span className="font-medium">notes</span>.
          </div>

          <FileInput
            label="Signed subsidy document (signedSubsidyDocument) *"
            name="signedSubsidyDocument"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileChange}
            error={fileError ?? undefined}
            resetTrigger={resetTrigger}
            currentFile={existingDocumentUrl?.split('/').pop()}
            documentUrl={existingDocumentUrl}
          />

          <div>
            <label htmlFor="signed-by" className="mb-1.5 block text-sm font-medium text-slate-700">
              Signed by (signedBy) *
            </label>
            <select
              id="signed-by"
              value={signedBy}
              onChange={(event) =>
                setSignedBy(event.target.value as UploadSignedSubsidyPayload['signedBy'])
              }
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            >
              {SIGNED_BY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.value})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="subsidy-upload-notes" className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="subsidy-upload-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={submitting}
              placeholder="Any context for the reviewer about this signed document…"
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </div>

          {formError && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
              {formError}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="text" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!file || submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              'Upload signed document'
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
