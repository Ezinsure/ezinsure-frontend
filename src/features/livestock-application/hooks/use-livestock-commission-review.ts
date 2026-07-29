'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  approveLivestockCommission,
  fetchLivestockApplicationsPendingAdminReview,
  type ApproveCommissionPayload,
  type LivestockCommissionReviewQueue,
} from '@/features/livestock-application/api/commission-workflow-api';
import type { LivestockApplicationListItem } from '@/features/livestock-application/domain/application-types';
import { useApiClient } from '@/utils/apiClient';

interface UseLivestockCommissionReviewResult {
  items: LivestockApplicationListItem[];
  count: number;
  totalVeterinaryCommission: number;
  isLoading: boolean;
  error: string | null;
  reload: (options?: { silent?: boolean }) => Promise<void>;
  approveOne: (applicationId: string, payload?: ApproveCommissionPayload) => Promise<void>;
  approveMany: (
    applicationIds: string[],
    payload?: ApproveCommissionPayload,
  ) => Promise<{ successful: number; failed: number }>;
  isApproving: boolean;
}

export function useLivestockCommissionReview(): UseLivestockCommissionReviewResult {
  const { apiFetch } = useApiClient();
  const [queue, setQueue] = useState<LivestockCommissionReviewQueue>({
    items: [],
    count: 0,
    totalVeterinaryCommission: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const next = await fetchLivestockApplicationsPendingAdminReview(apiFetch);
        setQueue(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load admin review queue.');
        setQueue({ items: [], count: 0, totalVeterinaryCommission: 0 });
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [apiFetch],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const approveOne = useCallback(
    async (applicationId: string, payload?: ApproveCommissionPayload) => {
      setIsApproving(true);
      try {
        await approveLivestockCommission(apiFetch, applicationId, payload);
        setQueue((prev) => ({
          ...prev,
          items: prev.items.filter((item) => item._id !== applicationId),
          count: Math.max(0, prev.count - 1),
        }));
      } finally {
        setIsApproving(false);
      }
    },
    [apiFetch],
  );

  const approveMany = useCallback(
    async (applicationIds: string[], payload?: ApproveCommissionPayload) => {
      if (applicationIds.length === 0) {
        return { successful: 0, failed: 0 };
      }

      setIsApproving(true);
      try {
        const results = await Promise.allSettled(
          applicationIds.map((id) => approveLivestockCommission(apiFetch, id, payload)),
        );
        const successfulIds = applicationIds.filter(
          (_, index) => results[index].status === 'fulfilled',
        );
        const successful = successfulIds.length;
        const failed = applicationIds.length - successful;

        if (successful > 0) {
          const approvedSet = new Set(successfulIds);
          setQueue((prev) => {
            const items = prev.items.filter((item) => !approvedSet.has(item._id));
            const removedCommission = prev.items
              .filter((item) => approvedSet.has(item._id))
              .reduce((sum, item) => sum + (item.veterinaryCommission ?? 0), 0);
            return {
              items,
              count: Math.max(0, prev.count - successful),
              totalVeterinaryCommission: Math.max(
                0,
                prev.totalVeterinaryCommission - removedCommission,
              ),
            };
          });
        }

        if (successful > 0 && failed === 0) {
          await reload({ silent: true });
        } else if (failed > 0) {
          await reload({ silent: true });
        }

        return { successful, failed };
      } finally {
        setIsApproving(false);
      }
    },
    [apiFetch, reload],
  );

  return {
    items: queue.items,
    count: queue.count,
    totalVeterinaryCommission: queue.totalVeterinaryCommission,
    isLoading,
    error,
    reload,
    approveOne,
    approveMany,
    isApproving,
  };
}
