import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { ApiError } from "@shared/interceptors/error";
import type { AuditCommentsResult } from "@entities/audit/model/audit-comment";
import listAuditComments from "../../lib/usecases/list-audit-comments";

/**
 * Clave estable para cache/invalidation de comentarios de auditoría.
 */
export const auditCommentsKey = (auditId: string, stepId?: string) =>
  ["audits", "comments", auditId, stepId ?? "all"] as const;

type Options = Omit<
  UseQueryOptions<
    AuditCommentsResult,
    ApiError,
    AuditCommentsResult,
    ReturnType<typeof auditCommentsKey>
  >,
  "queryKey" | "queryFn" | "enabled"
>;

export type UseAuditCommentsParams = {
  auditId?: string;
  stepId?: string;
};

/**
 * Hook React Query para obtener comentarios de una auditoría.
 */
export function useAuditComments(
  params: UseAuditCommentsParams,
  options?: Options
) {
  const { auditId, stepId } = params;
  const enabled = Boolean(auditId);

  return useQuery<
    AuditCommentsResult,
    ApiError,
    AuditCommentsResult,
    ReturnType<typeof auditCommentsKey>
  >({
    queryKey: auditCommentsKey(auditId ?? "", stepId),
    enabled,
    queryFn: () =>
      listAuditComments({
        auditId: auditId as string,
        stepId,
      }),
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
    ...options,
  });
}
