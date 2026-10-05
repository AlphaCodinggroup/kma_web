import type { ProjectsRepo } from "@entities/projects/api/projects.repo";
import type { Project, ProjectId } from "@entities/projects/model";

/**
 * Caso de uso: obtener el detalle de un proyecto por id.
 *
 * `getById` es opcional en el puerto; si el repositorio no lo implementa se
 * falla explícitamente en lugar de devolver un proyecto vacío.
 */
export async function getProjectById(
  repo: ProjectsRepo,
  id: ProjectId
): Promise<Project> {
  if (!repo.getById) {
    throw new Error("The projects repository cannot fetch a single project");
  }
  return await repo.getById(id);
}
