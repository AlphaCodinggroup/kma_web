import type { Project, ProjectId } from "@entities/projects/model";
import { projectsRepoImpl } from "@features/projects/api/projects.repo.impl";

/**
 * Input de dominio para archivar un proyecto.
 */
export type ArchiveProjectInput = {
  id: ProjectId;
};

/**
 * Resultado de archivar un proyecto: el proyecto actualizado.
 */
export type ArchiveProjectResult = Project;

/**
 * Caso de uso: archivar un proyecto.
 */
export async function archiveProjectUseCase(
  input: ArchiveProjectInput
): Promise<ArchiveProjectResult> {
  const id = input.id.trim();

  if (!id) {
    throw new Error("Project id is required to archive a project");
  }

  return projectsRepoImpl.archive(id);
}
