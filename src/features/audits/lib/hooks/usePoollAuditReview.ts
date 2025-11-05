import type { ReviewProgress } from "@entities/audit/model/sendReview";
import { auditReviewRepo } from "@features/audits/api/sendReview.repo.impl";
import type { ApiError } from "@shared/interceptors/error";
import {
  useQuery,
  type UseQueryOptions,
  type QueryKey,
} from "@tanstack/react-query";

/**
 * Hook de polling para el estado de revisión (PASO 3).
 * - Hace GET usando `auditReviewId`
 * - Refresca cada `refetchIntervalMs` (default 5000 ms)
 * - Se detiene automáticamente cuando:
 *    - reviewReady === true  OR
 *    - status === "pending_review"
 */
export function usePollAuditReview(params: {
  auditReviewId?: string;
  enabled?: boolean;
  refetchIntervalMs?: number;
  stopWhenReady?: boolean;
  options?: Omit<
    UseQueryOptions<ReviewProgress, ApiError, ReviewProgress, QueryKey>,
    "queryKey" | "queryFn" | "enabled" | "refetchInterval"
  >;
}) {
  const {
    auditReviewId,
    enabled = true,
    refetchIntervalMs = 5000,
    stopWhenReady = true,
    options,
  } = params;

  const shouldStart = enabled && Boolean(auditReviewId);

  return useQuery<ReviewProgress, ApiError, ReviewProgress, QueryKey>({
    queryKey: ["audits", "review", auditReviewId] as QueryKey,
    enabled: shouldStart,
    queryFn: async () => {
      return auditReviewRepo.pollReview(auditReviewId as string);
    },
    // Detenemos el polling cuando se cumple la condición de "ready"
    refetchInterval: (query) => {
      if (!stopWhenReady) return refetchIntervalMs;
      const data = query.state.data as ReviewProgress | undefined;
      const isReady =
        data?.reviewReady === true || data?.status === "pending_review";

      return isReady ? false : refetchIntervalMs;
    },
    refetchIntervalInBackground: true,
    ...options,
  });
}
