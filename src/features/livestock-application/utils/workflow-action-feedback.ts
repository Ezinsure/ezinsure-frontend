import { LivestockApiError } from '@/features/livestock-application/api/http';
import {
  humanizeLivestockApiError,
  type LivestockErrorContext,
} from '@/features/livestock-application/api/error-messages';

export function formatWorkflowActionError(
  err: unknown,
  fallback: string,
  context: LivestockErrorContext = 'general',
): string {
  if (err instanceof LivestockApiError) {
    return err.message;
  }
  if (err instanceof Error && err.message.trim()) {
    return humanizeLivestockApiError(err.message, { context });
  }
  return fallback || humanizeLivestockApiError(null, { context });
}
