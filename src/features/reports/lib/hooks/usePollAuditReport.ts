import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { AuditReport } from "@entities/report/model/audit-report";
import { auditReportRepo } from "@features/reports/api/audit-report.repo.impl";
import { auditReportKey } from "./useAuditReport";
import type { ApiError } from "@shared/interceptors/error";
import { publicEnv } from "@shared/config/env";

type Options = Omit<
  UseQueryOptions<AuditReport, ApiError, AuditReport, QueryKey>,
  "queryKey" | "queryFn" | "enabled" | "refetchInterval"
>;

export function usePollAuditReport(params: {
  auditId?: string | undefined;
  enabled?: boolean | undefined;
  refetchIntervalMs?: number | undefined;
  options?: Options | undefined;
}) {
  const {
    auditId,
    enabled = true,
    refetchIntervalMs = publicEnv().reportPoll.intervalMs,
    options,
  } = params;

  return useQuery<AuditReport, ApiError, AuditReport, QueryKey>({
    ...options,
    queryKey: auditReportKey(auditId ?? ""),
    queryFn: () => auditReportRepo.getReport(auditId as string),
    enabled: enabled && Boolean(auditId),
    refetchInterval: (query) => {
      const report = query.state.data as AuditReport | undefined;
      return report?.reportUrl ? false : refetchIntervalMs;
    },
    refetchIntervalInBackground: true,
    staleTime: 0,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
