'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileInput } from '@/components/ui/file-input';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const EXT_PATTERN = /\.(jpe?g|png|pdf)$/i;

interface SubsidySignedUploadModalProps {
  open: boolean;
  onClose: () => void;
  applicationNumber: string;
  existingDocumentUrl?: string;
  onSubmit: (payload: { signedDocument: File; signedBy: 'SECTOR' }) => Promise<void>;
}

export function SubsidySignedUploadModal({
  open,
  onClose,
  applicationNumber,
  existingDocumentUrl,
  onSubmit,
}: SubsidySignedUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

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
    if (!file) return;
    setSubmitting(true);
    try {
      await onSubmit({ signedDocument: file, signedBy: 'SECTOR' });
      setFile(null);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Upload signed nkunganire document</h3>
        <p className="mt-1 text-sm text-slate-600">
          Application {applicationNumber} — scanned copy signed by the sector representative.
        </p>

        <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2 text-xs text-violet-900">
          Upload the fully signed sector Excel/PDF scan. Vet and SONARWA signatures can be added
          later via in-app signing (coming soon) or additional uploads.
        </div>

        <div className="mt-4">
          <FileInput
            label="Signed document scan *"
            name="signedDocument"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleFileChange}
            error={fileError ?? undefined}
            resetTrigger={resetTrigger}
            currentFile={existingDocumentUrl?.split('/').pop()}
            documentUrl={existingDocumentUrl}
          />
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
    </div>
  );
}
