import type { ProjectsRepo } from "@entities/projects/api/projects.repo";
import type {
  CreateProjectParams,
  CreateProjectResult,
  ProjectStatus,
} from "@entities/projects/model";

/**
 * Caso de uso: crear un nuevo Project.
 */
export async function createProject(
  repo: ProjectsRepo,
  params: CreateProjectParams
): Promise<CreateProjectResult> {
  const safeStatus: ProjectStatus = params.status ?? "ACTIVE";
  const safeUserIds = Array.isArray(params.userIds) ? params.userIds : [];
  const safeFacilityIds = Array.isArray(params.facilityIds)
    ? params.facilityIds
    : [];

  return await repo.create({
    name: params.name.trim(),
    code: params.code?.trim() ?? "",
    description: params.description?.trim() ?? "",
    status: safeStatus,
    userIds: safeUserIds,
    facilityIds: safeFacilityIds,
  });
}
