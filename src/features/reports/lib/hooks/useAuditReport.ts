import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { AuditReport } from "@entities/report/model/audit-report";
import { auditReportRepo } from "@features/reports/api/audit-report.repo.impl";
import type { ApiError } from "@shared/interceptors/error";

export const auditReportKey = (auditId: string) =>
  ["reports", "by-audit", auditId] as const;

type Options = Omit<
  UseQueryOptions<
    AuditReport,
    ApiError,
    AuditReport,
    ReturnType<typeof auditReportKey>
  >,
  "queryKey" | "queryFn"
>;

export function useAuditReport(auditId?: string, options?: Options) {
  const isEnabled = options?.enabled ?? Boolean(auditId);

  return useQuery<
    AuditReport,
    ApiError,
    AuditReport,
    ReturnType<typeof auditReportKey>
  >({
    queryKey: auditReportKey(auditId || ""),
    enabled: isEnabled,
    queryFn: async () => auditReportRepo.getReport(auditId as string),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    ...options,
  });
}
