"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { AuditCommentsList } from "@entities/audit/model/comments";
import type { ApiError } from "@shared/interceptors/error";
import { listAuditComments } from "@features/audits/lib/usecases/listAuditComments";

export const auditCommentsKey = (auditId: string) =>
  ["audits", "comments", "list", auditId] as const;

type Options = Omit<
  UseQueryOptions<
    AuditCommentsList,
    ApiError,
    AuditCommentsList,
    ReturnType<typeof auditCommentsKey>
  >,
  "queryKey" | "queryFn"
>;

export function useAuditComments(auditId?: string, options?: Options) {
  const enabled = Boolean(auditId) && (options?.enabled ?? true);

  return useQuery<
    AuditCommentsList,
    ApiError,
    AuditCommentsList,
    ReturnType<typeof auditCommentsKey>
  >({
    queryKey: auditCommentsKey(auditId || ""),
    enabled,
    queryFn: () => listAuditComments(auditId as string),
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
    ...options,
  });
}
