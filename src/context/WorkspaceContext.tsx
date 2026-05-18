'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { ProductLine } from '@/shared/types/product-line';
import {
  canAccessProductLine,
  resolveUserDefaultProductLine,
  resolveUserProductLines,
} from '@/shared/utils/product-line-access';
import {
  getDashboardPath,
  getRolePathPrefix,
  parseProductLineFromPath,
  resolveProductLineFromPath,
} from '@/shared/routing/paths';
import { isVeterinaryRole, normalizeRole } from '@/shared/utils/role';

const WORKSPACE_STORAGE_KEY = 'ezinsure_workspace';

interface WorkspaceContextValue {
  activeProductLine: ProductLine;
  allowedProductLines: ProductLine[];
  canSwitchWorkspace: boolean;
  setProductLine: (line: ProductLine) => void;
  buildPath: (pathWithinWorkspace: string) => string;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

function readStoredProductLine(): ProductLine | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
  if (stored === 'motor' || stored === 'livestock') {
    return stored;
  }
  return null;
}

function persistProductLine(line: ProductLine) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WORKSPACE_STORAGE_KEY, line);
}

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const cleanPath = pathname.split('?')[0];

  const allowedProductLines = useMemo(
    () => resolveUserProductLines(user),
    [user],
  );

  const defaultProductLine = useMemo(
    () => resolveUserDefaultProductLine(user),
    [user],
  );

  const pathProductLine = useMemo(
    () => resolveProductLineFromPath(cleanPath, defaultProductLine),
    [cleanPath, defaultProductLine],
  );

  const [activeProductLine, setActiveProductLine] = useState<ProductLine>(defaultProductLine);

  useEffect(() => {
    if (!user) return;

    const fromPath = parseProductLineFromPath(cleanPath);
    if (fromPath && canAccessProductLine(user, fromPath)) {
      setActiveProductLine(fromPath);
      persistProductLine(fromPath);
      return;
    }

    const stored = readStoredProductLine();
    const next =
      stored && canAccessProductLine(user, stored)
        ? stored
        : defaultProductLine;

    setActiveProductLine(next);
  }, [user, cleanPath, defaultProductLine]);

  const canSwitchWorkspace = allowedProductLines.length > 1;

  const setProductLine = useCallback(
    (line: ProductLine) => {
      if (!user || !canAccessProductLine(user, line)) {
        return;
      }

      setActiveProductLine(line);
      persistProductLine(line);

      router.push(getDashboardPath(user.role, line));
    },
    [user, router],
  );

  const buildPath = useCallback(
    (pathWithinWorkspace: string) => {
      if (!user) return pathWithinWorkspace;

      const role = normalizeRole(user.role);
      const normalized = pathWithinWorkspace.startsWith('/')
        ? pathWithinWorkspace
        : `/${pathWithinWorkspace}`;

      const rolePrefix = getRolePathPrefix(role);

      if (isVeterinaryRole(role)) {
        return `/${rolePrefix}/livestock${normalized}`;
      }

      if (role === 'AGENT') {
        return `/${rolePrefix}/motor${normalized}`;
      }

      return `/${rolePrefix}/${activeProductLine}${normalized}`;
    },
    [user, activeProductLine],
  );

  useEffect(() => {
    if (isLoading || !user) return;

    const fromPath = parseProductLineFromPath(cleanPath);
    if (fromPath && !canAccessProductLine(user, fromPath)) {
      router.replace(getDashboardPath(user.role, defaultProductLine));
    }
  }, [isLoading, user, cleanPath, defaultProductLine, router]);

  useEffect(() => {
    if (isLoading || !user || user.role !== 'AGENT') return;
    if (cleanPath.includes('/livestock')) {
      router.replace(getDashboardPath('AGENT', 'motor'));
    }
  }, [isLoading, user, cleanPath, router]);

  useEffect(() => {
    if (isLoading || !user || !isVeterinaryRole(user.role)) return;
    if (!cleanPath.startsWith('/vet/livestock')) {
      router.replace(getDashboardPath(user.role, 'livestock'));
    }
  }, [isLoading, user, cleanPath, router]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      activeProductLine: pathProductLine ?? activeProductLine,
      allowedProductLines,
      canSwitchWorkspace,
      setProductLine,
      buildPath,
    }),
    [
      pathProductLine,
      activeProductLine,
      allowedProductLines,
      canSwitchWorkspace,
      setProductLine,
      buildPath,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
