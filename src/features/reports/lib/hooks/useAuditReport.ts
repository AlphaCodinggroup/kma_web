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
  // Boolean(auditId) manda: con `enabled: true` explícito y sin auditId la
  // query se disparaba igual y el repositorio recibía un id vacío. Es el patrón
  // que ya usan el resto de los hooks del proyecto.
  const isEnabled = Boolean(auditId) && (options?.enabled ?? true);

  return useQuery<
    AuditReport,
    ApiError,
    AuditReport,
    ReturnType<typeof auditReportKey>
  >({
    queryKey: auditReportKey(auditId || ""),
    queryFn: async () => auditReportRepo.getReport(auditId as string),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    ...options,
    // `enabled` va DESPUÉS del spread: puesto antes, el `enabled: true` del
    // llamador pisaba el cálculo y la query se disparaba sin auditId.
    enabled: isEnabled,
  });
}
