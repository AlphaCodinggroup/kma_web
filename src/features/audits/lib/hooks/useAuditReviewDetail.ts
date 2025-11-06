import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { AuditReviewDetail } from "@entities/audit/model/audit-review";
import type { ApiError } from "@shared/interceptors/error";
import { auditReviewDetailRepo } from "@features/audits/api/audit-review.repo.impl";

/** Clave estable para invalidación/selectores */
export const auditReviewDetailKey = (auditId: string) =>
  ["audits", "review-detail", auditId] as const;

type Options = Omit<
  UseQueryOptions<
    AuditReviewDetail,
    ApiError,
    AuditReviewDetail,
    ReturnType<typeof auditReviewDetailKey>
  >,
  "queryKey" | "queryFn" | "enabled"
>;

export function useAuditReviewDetail(auditId?: string, options?: Options) {
  const enabled = Boolean(auditId);

  return useQuery<
    AuditReviewDetail,
    ApiError,
    AuditReviewDetail,
    ReturnType<typeof auditReviewDetailKey>
  >({
    queryKey: auditReviewDetailKey(auditId || ""),
    enabled,
    queryFn: async () => {
      return auditReviewDetailRepo.getReviewDetail(auditId as string);
    },
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
    ...options,
  });
}
