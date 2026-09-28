'use client';

import { FileText, ImageIcon } from 'lucide-react';
import {
  isImageDocumentPath,
  type ApplicationDocumentItem,
} from './vet-application-types';
import { ProfileSection } from './profile-section';

type Props = {
  documents: ApplicationDocumentItem[];
  onOpenDocument: (name: string, path?: string | null) => void;
};

export function ApplicationDocumentsGrid({
  documents,
  onOpenDocument,
}: Props) {
  return (
    <ProfileSection
      title="Documents"
      description="Open each file to verify identity and licence details."
    >
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => {
          const uploaded = Boolean(doc.path?.trim());
          const showImage =
            uploaded &&
            (doc.kind === 'image' || isImageDocumentPath(doc.path));

          return (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => onOpenDocument(doc.label, doc.path)}
                className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition hover:border-slate-300 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                <div className="flex h-28 items-center justify-center bg-slate-100">
                  {showImage && doc.path ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote Cloudinary URLs; DocumentViewer handles full preview
                    <img
                      src={doc.path}
                      alt={doc.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-400">
                      {showImage ? (
                        <ImageIcon className="h-8 w-8" aria-hidden />
                      ) : (
                        <FileText className="h-8 w-8" aria-hidden />
                      )}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-slate-900">{doc.label}</p>
                  <p
                    className={`mt-0.5 text-xs font-medium ${
                      uploaded ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {uploaded ? 'Uploaded — click to view' : 'Not provided'}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </ProfileSection>
  );
}

export function buildVetApplicationDocuments(user: {
  passportPhoto?: string;
  nationalIdDocument?: string;
  rcvdLicenceDocument?: string;
}): ApplicationDocumentItem[] {
  return [
    {
      id: 'passportPhoto',
      label: 'Passport photo',
      path: user.passportPhoto,
      kind: 'image',
    },
    {
      id: 'nationalIdDocument',
      label: 'National ID',
      path: user.nationalIdDocument,
      kind: 'file',
    },
    {
      id: 'rcvdLicenceDocument',
      label: 'RCVD licence',
      path: user.rcvdLicenceDocument,
      kind: 'file',
    },
  ];
}
