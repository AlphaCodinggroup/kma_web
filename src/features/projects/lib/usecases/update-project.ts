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
  // Un nombre en blanco viajaba como "" y dejaba el proyecto sin nombre: si se
  // manda el campo, tiene que traer contenido.
  if (trimmedName !== undefined && trimmedName === "") {
    throw new Error("Project name is required");
  }

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
    ...(params.status ? { status: params.status } : {}),
  });
}
