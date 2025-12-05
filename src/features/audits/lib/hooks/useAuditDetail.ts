import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { AuditDetail } from "@entities/audit/model/audit-detail";
import getAuditById from "@features/audits/lib/usecases/getAuditById";

export const auditDetailKey = (auditId: string) =>
  ["audits", "detail", auditId] as const;

type Options = Omit<
  UseQueryOptions<
    AuditDetail,
    Error,
    AuditDetail,
    ReturnType<typeof auditDetailKey>
  >,
  "queryKey" | "queryFn"
>;

export function useAuditDetail(auditId?: string, options?: Options) {
  const enabled = Boolean(auditId) && (options?.enabled ?? true);

  return useQuery<
    AuditDetail,
    Error,
    AuditDetail,
    ReturnType<typeof auditDetailKey>
  >({
    queryKey: auditDetailKey(auditId || ""),
    enabled,
    queryFn: () => getAuditById(auditId as string),
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
    ...options,
  });
}
