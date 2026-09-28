'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useToast } from '@/components/ui/toast';

interface WorkflowToastContextValue {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const WorkflowToastContext = createContext<WorkflowToastContextValue | null>(null);

export function WorkflowToastProvider({ children }: { children: ReactNode }) {
  const { showToast, ToastContainer } = useToast();

  const value: WorkflowToastContextValue = {
    showSuccess: (message) => showToast(message, 'success'),
    showError: (message) => showToast(message, 'error'),
    showInfo: (message) => showToast(message, 'info'),
  };

  return (
    <WorkflowToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </WorkflowToastContext.Provider>
  );
}

export function useWorkflowToast(): WorkflowToastContextValue {
  const context = useContext(WorkflowToastContext);
  if (!context) {
    throw new Error('useWorkflowToast must be used within WorkflowToastProvider');
  }
  return context;
}
