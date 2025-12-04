import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

import type { ApiError } from "@shared/interceptors/error";
import type {
  ReportListFilter,
  ReportListPage,
} from "@entities/report/model/report-list";
import { fetchReports } from "@features/reports/lib/usecases/fetch-reports";
import { reportsRepo } from "@features/reports/api/reports.repo.impl";

/**
 * Clave estable de React Query para el listado de reports.
 * Incluimos los filtros para que el cache sea por combinación de filtros.
 */
export const reportsListQueryKey = (filters?: ReportListFilter): QueryKey =>
  ["reports", filters ?? {}] as const;

/**
 * Factory de opciones para usar tanto en hooks como en prefetch SSR.
 */
export const createReportsListQueryOptions = (
  filters?: ReportListFilter
): UseQueryOptions<
  ReportListPage,
  ApiError,
  ReportListPage,
  ReturnType<typeof reportsListQueryKey>
> => ({
  queryKey: reportsListQueryKey(filters),
  queryFn: () => fetchReports(reportsRepo, filters),
  staleTime: 60_000, // 1 minuto: los reports no cambian cada segundo
});

/**
 * Parámetros del hook de listado de reports.
 * `enabled` permite deshabilitar condicionalmente la query.
 */
export type UseReportsListQueryParams = ReportListFilter & {
  enabled?: boolean;
};

/**
 * Hook de alto nivel para listar reports con React Query.
 */
export function useReportsListQuery(
  params?: UseReportsListQueryParams
): UseQueryResult<ReportListPage, ApiError> {
  const { enabled = true, ...rawFilters } = params ?? {};

  // Si no hay filtros, pasamos undefined para no crear objetos vacíos innecesarios.
  const hasFilterKeys = Object.keys(rawFilters).length > 0;
  const filters: ReportListFilter | undefined = hasFilterKeys
    ? rawFilters
    : undefined;

  return useQuery({
    ...createReportsListQueryOptions(filters),
    enabled,
  });
}
