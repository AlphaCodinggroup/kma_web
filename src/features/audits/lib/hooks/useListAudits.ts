import { useQuery, keepPreviousData, QueryClient } from "@tanstack/react-query";
import type { AuditType } from "@entities/audit/model";
import listAudits from "../../lib/usecases/listAudits";

export type UseListAuditsOptions = {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
};

/**
 * Hook: lista de audits.
 * - Usa keepPreviousData para evitar parpadeos en cambios de filtros.
 * - Retrys conservadores.
 */
export default function useListAudits(opts?: UseListAuditsOptions) {
  return useQuery<AuditType, Error>({
    queryKey: ["audits", "list"],
    queryFn: () => listAudits(),
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
    queryKey: ["audits", "list"],
    queryFn: () => listAudits(),
    staleTime: 60_000,
  });
}
