import type { Project, ProjectId } from "@entities/projects/model";
import { projectsRepoImpl } from "@features/projects/api/projects.repo.impl";

/**
 * Input de dominio para restaurar un proyecto archivado.
 */
export type RestoreProjectInput = {
  id: ProjectId;
};

/**
 * Resultado de restaurar un proyecto: el proyecto actualizado.
 */
export type RestoreProjectResult = Project;

/**
 * Caso de uso: restaurar un proyecto archivado.
 */
export async function restoreProjectUseCase(
  input: RestoreProjectInput
): Promise<RestoreProjectResult> {
  const id = input.id.trim();

  if (!id) {
    throw new Error("Project id is required to restore a project");
  }

  return projectsRepoImpl.restore(id);
}
