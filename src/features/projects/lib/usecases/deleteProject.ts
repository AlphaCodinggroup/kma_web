import type { ProjectId } from "@entities/projects/model";
import type { ProjectsRepo } from "@entities/projects/api/projects.repo";
import { projectsRepoImpl } from "@features/projects/api/projects.repo.impl";

export interface DeleteProjectDeps {
  projectsRepo?: ProjectsRepo;
}

/**
 * Caso de uso: eliminar un proyecto.
 *
 * - Orquesta la operación de dominio.
 * - Permite inyectar un repositorio diferente para tests (projectsRepo).
 * - Por defecto usa la implementación HTTP real (projectsRepoImpl).
 */
export async function deleteProject(
  id: ProjectId,
  deps: DeleteProjectDeps = {}
): Promise<void> {
  const repo = deps.projectsRepo ?? projectsRepoImpl;
  await repo.deleteProject(id);
}
