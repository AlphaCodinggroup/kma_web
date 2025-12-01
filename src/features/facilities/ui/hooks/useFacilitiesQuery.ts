import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
  FacilityListPage,
  FacilityListFilter,
} from "@entities/facility/model";
import { facilitiesRepoImpl } from "@features/facilities/api/facilities.repo.impl";
import type { ApiError } from "@shared/interceptors/error";

const FACILITIES_QUERY_KEY = "facilities" as const;

/**
 * Clave estable para React Query.
 * Usamos un prefijo fijo + filtros para segmentar bien la cache.
 */
function createFacilitiesQueryKey(filters?: FacilityListFilter) {
  return [FACILITIES_QUERY_KEY, filters] as const;
}

/**
 * Hook React Query para obtener la lista de Facilities.
 *
 * - Encapsula la llamada al repositorio (axios + proxy interno).
 * - Soporta filtros: limit, cursor, status, search, projectId.
 * - Configura staleTime y retry de forma conservadora.
 */
export function useFacilitiesQuery(
  filters?: FacilityListFilter
): UseQueryResult<FacilityListPage, ApiError> {
  return useQuery<FacilityListPage, ApiError>({
    queryKey: createFacilitiesQueryKey(filters),
    queryFn: () => facilitiesRepoImpl.getFacilities(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2,
  });
}
