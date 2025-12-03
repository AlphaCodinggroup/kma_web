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
 * - Normaliza users/facilities a [] para evitar undefined.
 */
export async function createProject(
  repo: ProjectsRepo,
  params: CreateProjectParams
): Promise<CreateProjectResult> {
  const safeStatus: ProjectStatus = params.status ?? "ACTIVE";
  const name = params.name.trim();

  if (!name) {
    throw new Error("Project name is required");
  }

  const code = params.code?.trim();
  const description = params.description?.trim();

  // Normalizamos arrays opcionales → siempre arrays
  const users = params.users ?? [];
  const facilities = params.facilities ?? [];

  return await repo.create({
    name,
    status: safeStatus,
    ...(code ? { code } : {}),
    ...(description ? { description } : {}),
    users,
    facilities,
  });
}
