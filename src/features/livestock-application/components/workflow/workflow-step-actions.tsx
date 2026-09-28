'use client';

import type { ReactNode } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkflowStepActionsProps {
  children: ReactNode;
  className?: string;
}

/** Groups primary and secondary actions inside workflow step cards. */
export function WorkflowStepActions({ children, className = '' }: WorkflowStepActionsProps) {
  return (
    <div className={`flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center ${className}`}>
      {children}
    </div>
  );
}

const primaryActionClass =
  'h-9 min-w-[9rem] px-4 text-sm font-semibold shadow-sm ring-1 ring-[var(--main-blue)]/10';

const documentActionClass =
  'h-9 gap-1.5 border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50';

interface WorkflowPrimaryActionProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export function WorkflowPrimaryAction({
  children,
  onClick,
  disabled,
  loading,
  icon,
}: WorkflowPrimaryActionProps) {
  return (
    <Button
      type="button"
      variant="primary"
      size="sm"
      className={primaryActionClass}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon}
      {children}
    </Button>
  );
}

const secondaryActionClass =
  'h-9 min-w-[9rem] border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50';

interface WorkflowSecondaryActionProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export function WorkflowSecondaryAction({
  children,
  onClick,
  disabled,
  loading,
  icon,
}: WorkflowSecondaryActionProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={secondaryActionClass}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon}
      {children}
    </Button>
  );
}

interface WorkflowDocumentActionProps {
  label: string;
  onClick: () => void;
}

export function WorkflowDocumentAction({ label, onClick }: WorkflowDocumentActionProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={documentActionClass}
      onClick={onClick}
    >
      <Eye className="h-4 w-4 shrink-0 text-slate-500" />
      {label}
    </Button>
  );
}
