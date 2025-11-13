import { httpClient } from "@shared/api/http.client";
import type { ProjectsRepo } from "@entities/projects/api/projects.repo";
import type {
  ProjectListFilter,
  ProjectListPage,
  ProjectId,
  Project,
} from "@entities/projects/model";
import {
  mapProjectsListFromDTO,
  mapProjectFromDTO,
  type ProjectsResponseDTO,
  type ProjectDTO,
} from "@entities/projects/lib/mappers";
import type { ApiError } from "@shared/interceptors/error";

/**
 * Utilidad defensiva para normalizar errores desconocidos.
 */
function toApiError(err: unknown): ApiError {
  if (err && typeof err === "object" && "code" in err && "message" in err) {
    const e = err as { code: string; message: string; details?: unknown };
    return { code: e.code, message: e.message, details: e.details };
  }
  return {
    code: "UNEXPECTED_ERROR",
    message: "Unexpected error",
    details: err,
  } as const;
}

/**
 * Implementación axios del repositorio de Projects.
 * Usa el proxy interno /api/projects (Next.js route handler).
 * Esto evita exponer el token en el cliente.
 */
export const projectsRepoImpl: ProjectsRepo = {
  async getProjects(params?: ProjectListFilter): Promise<ProjectListPage> {
    try {
      const response = await httpClient.get<ProjectsResponseDTO>(
        "/api/projects",
        {
          params: {
            limit: params?.limit,
            status: params?.status,
            search: params?.search,
            cursor: params?.cursor,
            sortBy: params?.sortBy,
            sortOrder: params?.sortOrder,
          },
        }
      );
      return mapProjectsListFromDTO(response.data);
    } catch (err) {
      throw toApiError(err);
    }
  },

  async getById(id: ProjectId): Promise<Project> {
    try {
      const response = await httpClient.get<{
        data: ProjectDTO;
        status: string;
      }>(`/api/projects/${id}`);
      return mapProjectFromDTO(response.data.data);
    } catch (err) {
      throw toApiError(err);
    }
  },
};
