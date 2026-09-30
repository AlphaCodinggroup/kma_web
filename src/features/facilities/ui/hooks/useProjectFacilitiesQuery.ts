import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { ProjectFacility } from "@entities/facility/model";
import { facilitiesRepoImpl } from "@features/facilities/api/facilities.repo.impl";
import type { ApiError } from "@shared/interceptors/error";

/**
 * Clave de las facilities de un proyecto. Cuelga de "projects" para que las
 * mutaciones que invalidan ["projects"] (editar el proyecto y reasignar sus
 * facilities) también la refresquen.
 */
export const projectFacilitiesQueryKey = (projectId: string) =>
  ["projects", "detail", projectId, "facilities"] as const;

/**
 * Facilities de un proyecto con su dirección y ciudad. Sin id no consulta.
 * El staleTime es corto: la dirección se edita en otra pantalla.
 */
export function useProjectFacilitiesQuery(
  projectId: string | undefined
): UseQueryResult<ProjectFacility[], ApiError> {
  return useQuery<ProjectFacility[], ApiError>({
    queryKey: projectFacilitiesQueryKey(projectId ?? ""),
    queryFn: () => facilitiesRepoImpl.getByProject(projectId as string),
    enabled: Boolean(projectId),
    staleTime: 1000 * 30,
    retry: 2,
  });
}
