import { useQuery, keepPreviousData, QueryClient } from "@tanstack/react-query";
import type { AuditType } from "@entities/audit/model";
import listAudits from "../../lib/usecases/listAudits";

export type UseListAuditsOptions = {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  // Filter and pagination params
  status?: string;
  auditor?: string;
  limit?: number;
  last_eval_id?: string;
};

/**
 * Hook: lista de audits.
 * - Usa keepPreviousData para evitar parpadeos en cambios de filtros.
 * - Retrys conservadores.
 * - Soporta filtros y paginación server-side.
 */
export default function useListAudits(opts?: UseListAuditsOptions) {
  // Build params object only with defined values
  const params: import("@entities/audit/api/audit.repo").AuditListParams = {
    limit: opts?.limit ?? 200, // Default limit for hybrid pagination
  };

  if (opts?.status) params.status = opts.status;
  if (opts?.auditor) params.auditor = opts.auditor;
  if (opts?.last_eval_id) params.last_eval_id = opts.last_eval_id;

  return useQuery<AuditType, Error>({
    queryKey: ["audits", "list", opts?.status, opts?.auditor, opts?.last_eval_id],
    queryFn: () => listAudits({ params }),
    placeholderData: keepPreviousData,
    enabled: opts?.enabled ?? true,
    staleTime: opts?.staleTime ?? 60_000,
    gcTime: opts?.gcTime ?? 5 * 60_000,
    retry: (failureCount) => failureCount < 2,
  });
}

/** Prefetch opcional para Server/SSR. */
export async function prefetchListAudits(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: ["audits", "list", undefined, undefined, undefined],
    queryFn: () => listAudits(),
    staleTime: 60_000,
  });
}
