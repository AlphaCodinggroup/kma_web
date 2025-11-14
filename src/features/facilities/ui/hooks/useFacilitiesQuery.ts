import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type {
  FacilityListPage,
  FacilityListFilter,
} from "@entities/facility/model";
import { facilitiesRepoImpl } from "@features/facilities/api/facilities.repo.impl";

/**
 * Clave estable para React Query.
 * Se usa un array con prefijo + filtros serializados para un cache segmentado y controlado.
 */
function createFacilitiesQueryKey(
  filters?: FacilityListFilter & { projectId?: string }
) {
  return ["facilities", filters] as const;
}

/**
 * Hook React Query para obtener la lista de Facilities.
 * - Encapsula la llamada al repositorio (axios + proxy interno).
 * - Soporta filtros, paginación y staleTime configurable.
 */
export function useFacilitiesQuery(
  filters?: FacilityListFilter & { projectId?: string }
): UseQueryResult<FacilityListPage> {
  return useQuery({
    queryKey: createFacilitiesQueryKey(filters),
    queryFn: () => facilitiesRepoImpl.getFacilities(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2,
  });
}
