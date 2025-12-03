import type { ProjectsRepo } from "@entities/projects/api/projects.repo";
import type {
  UpdateProjectParams,
  UpdateProjectResult,
} from "@entities/projects/model";

/**
 * Caso de uso: actualizar un Project existente.
 */
export async function updateProject(
  repo: ProjectsRepo,
  params: UpdateProjectParams
): Promise<UpdateProjectResult> {
  const trimmedName = params.name?.trim();
  const trimmedCode = params.code?.trim();
  const trimmedDescription = params.description?.trim();

  return await repo.update({
    id: params.id,
    ...(trimmedName !== undefined ? { name: trimmedName } : {}),
    ...(trimmedCode !== undefined ? { code: trimmedCode } : {}),
    ...(trimmedDescription !== undefined
      ? { description: trimmedDescription }
      : {}),
    ...(params.users ? { users: params.users } : {}),
    ...(params.facilities ? { facilities: params.facilities } : {}),
    ...(params.status ? { status: params.status } : {}),
  });
}
