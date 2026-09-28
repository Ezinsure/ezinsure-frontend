'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ApplicationDocumentsGrid,
  buildVetApplicationDocuments,
} from './application-documents-grid';
import { EmergencyContactsList } from './emergency-contacts-list';
import { VetProfileSummary } from './vet-profile-summary';
import type { VetApplicationProfile } from './vet-application-types';

type Props = {
  user: VetApplicationProfile | null;
  onClose: () => void;
  onStatusChange: (status: string, reason?: string) => void | Promise<void>;
  isLoading?: boolean;
  setViewingDocument: (doc: { name: string; path: string } | null) => void;
};

export function VetApplicationReviewModal({
  user,
  onClose,
  onStatusChange,
  isLoading = false,
  setViewingDocument,
}: Props) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  if (!user) return null;

  const isPending = user.status === 'PENDING';
  const busy = isLoading || isApproving || isRejecting;

  const openDocument = (name: string, path?: string | null) => {
    setViewingDocument({
      name,
      path: path?.trim() ? path : '/File_not_found.jpg',
    });
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onStatusChange('SENT_FOR_ACTION', rejectionReason);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onStatusChange('ACTIVE');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vet-review-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Veterinarian application
            </p>
            <h3
              id="vet-review-title"
              className="mt-0.5 text-lg font-semibold text-slate-900"
            >
              {isPending ? 'Review application' : 'Veterinarian details'}
            </h3>
            <p className="mt-1 text-sm text-slate-600">{user.fullName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          <VetProfileSummary user={user} />
          <EmergencyContactsList contacts={user.emergencyContacts} />
          <ApplicationDocumentsGrid
            documents={buildVetApplicationDocuments(user)}
            onOpenDocument={openDocument}
          />

          {user.rejectionReason ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <h4 className="text-sm font-semibold text-rose-800">
                Previous action note
              </h4>
              <p className="mt-1 text-sm text-rose-700">{user.rejectionReason}</p>
            </div>
          ) : null}

          {user.deactivationHistory && user.deactivationHistory.length > 0 ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4">
              <h4 className="mb-3 text-sm font-semibold text-rose-900">
                Deactivation history
              </h4>
              <ul className="space-y-3">
                {user.deactivationHistory.map((entry, index) => (
                  <li
                    key={entry._id}
                    className="border-l-4 border-rose-400 pl-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-rose-900">
                          Deactivation #{index + 1}
                        </p>
                        <p className="text-xs text-slate-600">
                          {new Date(entry.deactivationDate).toLocaleString()}
                        </p>
                      </div>
                      {entry.deactivationFile ? (
                        <Button
                          variant="text"
                          size="sm"
                          onClick={() =>
                            window.open(entry.deactivationFile, '_blank')
                          }
                          className="text-rose-700"
                        >
                          View document
                        </Button>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-rose-800">
                      {entry.deactivationReason}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {isPending ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <label
                htmlFor="vet-rejection-reason"
                className="block text-sm font-medium text-slate-800"
              >
                Reason for send for action
              </label>
              <p className="mt-0.5 text-xs text-slate-500">
                Required only when sending the application back for correction.
              </p>
              <textarea
                id="vet-rejection-reason"
                rows={3}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-[var(--main-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--main-blue)]"
                placeholder="Explain what the applicant should correct…"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                disabled={busy}
              />
            </div>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <Button variant="text" onClick={onClose} disabled={busy}>
            Close
          </Button>
          {isPending ? (
            <>
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={busy || !rejectionReason.trim()}
              >
                {isRejecting ? 'Processing…' : 'Send for action'}
              </Button>
              <Button
                variant="primary"
                onClick={handleApprove}
                disabled={busy || rejectionReason.trim() !== ''}
              >
                {isApproving ? 'Processing…' : 'Approve'}
              </Button>
            </>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
