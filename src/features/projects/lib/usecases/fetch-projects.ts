import type { ProjectsRepo } from "@entities/projects/api/projects.repo";
import type {
  ProjectListFilter,
  ProjectListPage,
} from "@entities/projects/model";

/**
 * Caso de uso: obtener listado de proyectos.
 *
 * - Encapsula la llamada al repositorio.
 * - Permite aplicar transformaciones o cache locales si es necesario.
 * - Facilita testeo unitario sin depender de axios.
 */
export async function fetchProjects(
  repo: ProjectsRepo,
  filters?: ProjectListFilter
): Promise<ProjectListPage> {
  return await repo.getProjects(filters);
}
