import type { ProjectsRepo } from "@entities/projects/api/projects.repo";
import type {
  CreateProjectParams,
  CreateProjectResult,
  ProjectStatus,
} from "@entities/projects/model";

/**
 * Caso de uso: crear un nuevo Project.
 *
 * - Normaliza strings básicos.
 * - Asegura un status por defecto ("ACTIVE").
 * - Deja pasar `users` y `facilities` tal cual vienen desde la UI.
 */
export async function createProject(
  repo: ProjectsRepo,
  params: CreateProjectParams
): Promise<CreateProjectResult> {
  const safeStatus: ProjectStatus = params.status ?? "ACTIVE";

  return await repo.create({
    name: params.name.trim(),
    code: params.code?.trim() || undefined,
    description: params.description?.trim() || undefined,
    status: safeStatus,
    users: params.users,
    facilities: params.facilities,
  });
}
