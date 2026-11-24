'use client';

import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from './modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Say exactly what will happen and what cannot be undone. */
  description: ReactNode;
  /** Optional summary or form fields (e.g. totals, a reason box). */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` for destructive actions such as cancel or write off. */
  tone?: 'primary' | 'danger';
  busy?: boolean;
  /** Disables the confirm button until the form inside is valid. */
  confirmDisabled?: boolean;
  /** Server error to show inside the dialog so the user keeps their input. */
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** One confirmation dialog for every state-changing finance action. */
export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  busy = false,
  confirmDisabled = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      eyebrow="Confirm action"
      onClose={onCancel}
      busy={busy}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={busy} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            className="w-full sm:w-auto"
          >
            {busy ? <Loader2 aria-hidden className="mr-2 h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600">{description}</p>
      {children}
      {error ? (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
