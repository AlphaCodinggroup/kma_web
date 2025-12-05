import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchProjects } from "@features/projects/lib/usecases/fetch-projects";
import type {
  ProjectListFilter,
  ProjectListPage,
} from "@entities/projects/model";
import { projectsRepoImpl } from "@features/projects/api/projects.repo.impl";

/**
 * Clave estable para React Query.
 * Se usa un array con prefijo y filtros serializados para un cache segmentado y controlado.
 */
function createProjectsQueryKey(filters?: ProjectListFilter) {
  return ["projects", filters] as const;
}

/**
 * Hook React Query para obtener la lista de proyectos.
 * - Encapsula el caso de uso fetchProjects.
 * - Soporta filtros, paginación (cursor) y staleTime configurado.
 */
export function useProjectsQuery(
  filters?: ProjectListFilter
): UseQueryResult<ProjectListPage> {
  return useQuery({
    queryKey: createProjectsQueryKey(filters),
    queryFn: () => fetchProjects(projectsRepoImpl, filters),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
}
