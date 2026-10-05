import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getProjectById } from "@features/projects/lib/usecases/get-project";
import type { Project, ProjectId } from "@entities/projects/model";
import { projectsRepoImpl } from "@features/projects/api/projects.repo.impl";
import { isApiError } from "@shared/interceptors/error";

// Un proyecto inexistente no aparece reintentando, y la sesión vencida ya la
// resolvió el interceptor: el resto reintenta como en el QueryProvider.
const NON_RETRYABLE_CODES = new Set(["NOT_FOUND", "UNAUTHORIZED"]);

/**
 * Clave del detalle de un proyecto. Comparte el prefijo "projects" con el
 * listado, así las mutaciones que invalidan ["projects"] también la refrescan.
 */
export const projectDetailQueryKey = (id: ProjectId) =>
  ["projects", "detail", id] as const;

/**
 * Hook React Query para obtener un proyecto por id.
 * Sin id no se dispara la consulta.
 */
export function useProjectQuery(
  id: ProjectId | undefined
): UseQueryResult<Project> {
  return useQuery({
    queryKey: projectDetailQueryKey(id ?? ""),
    queryFn: () => getProjectById(projectsRepoImpl, id as ProjectId),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5,
    retry: (failureCount, error) =>
      !NON_RETRYABLE_CODES.has(isApiError(error) ? error.code : "") &&
      failureCount < 2,
  });
}
