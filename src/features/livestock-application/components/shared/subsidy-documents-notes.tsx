'use client';

import { FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SubsidyDocumentRecord } from '@/features/livestock-application/domain/application-types';

interface SubsidyDocumentsNotesProps {
  documents: SubsidyDocumentRecord[];
  onViewDocument?: (name: string, path: string) => void;
}

function signedByLabel(signedBy?: string): string {
  const value = String(signedBy ?? '').toUpperCase();
  if (value === 'SECTOR') return 'Sector signed';
  if (value === 'VET') return 'Veterinarian signed';
  if (value === 'SONARWA') return 'SONARWA signed';
  return signedBy?.trim() || 'Signed document';
}

export function SubsidyDocumentsNotes({
  documents,
  onViewDocument,
}: SubsidyDocumentsNotesProps) {
  const withContent = documents.filter(
    (doc) => Boolean(doc.notes?.trim()) || Boolean(doc.uploadedSignedDocumentUrl),
  );
  if (withContent.length === 0) return null;

  return (
    <div className="space-y-3">
      {withContent.map((doc, index) => (
        <div
          key={doc.id ?? `${doc.signedBy ?? 'doc'}-${index}`}
          className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
              {signedByLabel(doc.signedBy)}
              {doc.status ? ` · ${doc.status.replace(/_/g, ' ')}` : ''}
            </p>
            {doc.createdAt && (
              <p className="text-xs text-violet-700/80">
                {new Date(doc.createdAt).toLocaleString('en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            )}
          </div>

          {doc.notes?.trim() && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-violet-950">
              {doc.notes.trim()}
            </p>
          )}

          {doc.uploadedSignedDocumentUrl && onViewDocument && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() =>
                onViewDocument(
                  `Nkunganire (${signedByLabel(doc.signedBy)})`,
                  doc.uploadedSignedDocumentUrl!,
                )
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              View document
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
