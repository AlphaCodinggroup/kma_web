import { httpClient } from "@shared/api/http.client";
import type { ProjectsRepo } from "@entities/projects/api/projects.repo";
import type {
  ProjectListFilter,
  ProjectListPage,
  ProjectId,
  Project,
  CreateProjectParams,
  CreateProjectResult,
} from "@entities/projects/model";
import {
  mapProjectsListFromDTO,
  mapProjectFromDTO,
  type ProjectsResponseDTO,
  type ProjectDTO,
} from "@entities/projects/lib/mappers";
import type { ApiError } from "@shared/interceptors/error";

/** Body esperado por el upstream para crear un proyecto */
type CreateProjectRequestDTO = {
  name: string;
  code?: string;
  description?: string;
  user_ids?: string[];
  facility_ids?: string[];
  status?: "ACTIVE" | "ARCHIVED";
};

/** Utilidad defensiva: normaliza a ApiError en edge cases */
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
 */
export class ProjectsRepoHttp implements ProjectsRepo {
  constructor(private readonly basePath = "/api/projects") {}

  async getProjects(params?: ProjectListFilter): Promise<ProjectListPage> {
    try {
      const res = await httpClient.get<ProjectsResponseDTO>(this.basePath, {
        params: {
          limit: params?.limit,
          status: params?.status,
          search: params?.search,
          cursor: params?.cursor,
          sortBy: params?.sortBy,
          sortOrder: params?.sortOrder,
        },
      });
      return mapProjectsListFromDTO(res.data);
    } catch (err) {
      throw toApiError(err);
    }
  }

  async getById(id: ProjectId): Promise<Project> {
    try {
      const res = await httpClient.get<{ data: ProjectDTO; status: string }>(
        `${this.basePath}/${id}`
      );
      return mapProjectFromDTO(res.data.data);
    } catch (err) {
      throw toApiError(err);
    }
  }

  async create(params: CreateProjectParams): Promise<CreateProjectResult> {
    try {
      const body: CreateProjectRequestDTO = {
        name: params.name,
        ...(params.code ? { code: params.code } : {}),
        ...(params.description ? { description: params.description } : {}),
        ...(params.userIds ? { user_ids: params.userIds } : {}),
        ...(params.facilityIds ? { facility_ids: params.facilityIds } : {}),
        ...(params.status ? { status: params.status } : {}),
      };

      const res = await httpClient.post<{ data: ProjectDTO; status: string }>(
        this.basePath,
        body,
        { headers: { "Content-Type": "application/json" } }
      );

      return mapProjectFromDTO(res.data.data);
    } catch (err) {
      throw toApiError(err);
    }
  }
}

/** Singleton listo para inyectar donde lo necesites */
export const projectsRepoImpl = new ProjectsRepoHttp();
