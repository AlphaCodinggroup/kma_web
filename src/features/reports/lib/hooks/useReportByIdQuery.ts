import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

import type { ApiError } from "@shared/interceptors/error";
import type { ReportListItem } from "@entities/report/model/report-list";
import { fetchReportById } from "@features/reports/lib/usecases/fetch-report-by-id";
import { reportsRepo } from "@features/reports/api/reports.repo.impl";

export type UseReportByIdQueryParams = {
  id?: string | undefined;
  enabled?: boolean;
};

/**
 * Clave estable de React Query para la consulta de un reporte puntual.
 */
export const reportByIdQueryKey = (id: string): QueryKey =>
  ["report-download", id] as const;

/**
 * Factory de opciones (útil para SSR / prefetch en server components).
 */
export const createReportByIdQueryOptions = (
  id: string
): UseQueryOptions<
  ReportListItem,
  ApiError,
  ReportListItem,
  ReturnType<typeof reportByIdQueryKey>
> => ({
  queryKey: reportByIdQueryKey(id),
  queryFn: () => fetchReportById(reportsRepo, id),
});

/**
 * Hook para obtener el estado de un reporte por ID de auditoría.
 *
 * - status "completed"         → reportUrl lista para descargar.
 * - status "generating_report" → reportUrl = null, sigue generando.
 */
export function useReportByIdQuery(
  params: UseReportByIdQueryParams
): UseQueryResult<ReportListItem, ApiError> {
  const { id, enabled = true } = params;

  const hasId = Boolean(id);

  return useQuery<
    ReportListItem,
    ApiError,
    ReportListItem,
    ReturnType<typeof reportByIdQueryKey>
  >({
    queryKey: reportByIdQueryKey(id ?? "pending"),
    queryFn: () => {
      if (!id) {
        throw new Error("Report id is required");
      }
      return fetchReportById(reportsRepo, id);
    },
    enabled: hasId && enabled,
  });
}
