import { httpClient } from "@shared/api/http.client";
import type { ProjectsRepo } from "@entities/projects/api/projects.repo";
import type {
  ProjectListFilter,
  ProjectListPage,
  ProjectId,
  Project,
  CreateProjectParams,
  CreateProjectResult,
  UpdateProjectParams,
  UpdateProjectResult,
} from "@entities/projects/model";
import {
  mapProjectsListFromDTO,
  mapProjectFromDTO,
  type ProjectsResponseDTO,
  type ProjectDTO,
} from "@entities/projects/lib/mappers";
import type { ApiError } from "@shared/interceptors/error";

/** DTOs para creación/actualización */
type ProjectUserDTO = {
  id: string;
  name: string;
};

type ProjectFacilityDTO = {
  facility_id: string;
  name: string;
};

/** Body esperado por el upstream para crear un proyecto */
type CreateProjectRequestDTO = {
  name: string;
  code?: string;
  description?: string;
  users?: ProjectUserDTO[];
  facilities?: ProjectFacilityDTO[];
  status?: "ACTIVE" | "ARCHIVED";
};

/** Body esperado por el upstream para actualizar un proyecto */
type UpdateProjectRequestDTO = {
  name?: string;
  code?: string;
  description?: string;
  users?: ProjectUserDTO[];
  facilities?: ProjectFacilityDTO[];
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

  /** Listado paginado de proyectos */
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

  /** Detalle de proyecto por id */
  async getById(id: ProjectId): Promise<Project> {
    try {
      const res = await httpClient.get<
        ProjectDTO | { project: ProjectDTO } | { data: ProjectDTO }
      >(`${this.basePath}/${id}`);

      const raw = res.data as
        | ProjectDTO
        | { project: ProjectDTO }
        | { data: ProjectDTO };

      const dto: ProjectDTO =
        (raw as { project?: ProjectDTO }).project ??
        (raw as { data?: ProjectDTO }).data ??
        (raw as ProjectDTO);

      return mapProjectFromDTO(dto);
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Crea un nuevo proyecto */
  async create(params: CreateProjectParams): Promise<CreateProjectResult> {
    try {
      const body: CreateProjectRequestDTO = {
        name: params.name,
        ...(params.code ? { code: params.code } : {}),
        ...(params.description ? { description: params.description } : {}),
        ...(params.users && params.users.length
          ? {
              users: params.users.map((u) => ({
                id: u.id,
                name: u.name,
              })),
            }
          : {}),
        ...(params.facilities && params.facilities.length
          ? {
              facilities: params.facilities.map((f) => ({
                facility_id: f.id,
                name: f.name,
              })),
            }
          : {}),
        ...(params.status ? { status: params.status } : {}),
      };

      const res = await httpClient.post<
        ProjectDTO | { project: ProjectDTO } | { data: ProjectDTO }
      >(this.basePath, body, {
        headers: { "Content-Type": "application/json" },
      });

      const raw = res.data as
        | ProjectDTO
        | { project: ProjectDTO }
        | { data: ProjectDTO };

      const dto: ProjectDTO =
        (raw as { project?: ProjectDTO }).project ??
        (raw as { data?: ProjectDTO }).data ??
        (raw as ProjectDTO);

      return mapProjectFromDTO(dto);
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Actualiza un proyecto existente */
  async update(params: UpdateProjectParams): Promise<UpdateProjectResult> {
    try {
      const body: UpdateProjectRequestDTO = {
        ...(params.name ? { name: params.name } : {}),
        ...(params.code ? { code: params.code } : {}),
        ...(params.description ? { description: params.description } : {}),
        ...(params.users && params.users.length
          ? {
              users: params.users.map((u) => ({
                id: u.id,
                name: u.name,
              })),
            }
          : {}),
        ...(params.facilities && params.facilities.length
          ? {
              facilities: params.facilities.map((f) => ({
                facility_id: f.id,
                name: f.name,
              })),
            }
          : {}),
        ...(params.status ? { status: params.status } : {}),
      };

      const res = await httpClient.patch<
        ProjectDTO | { project: ProjectDTO } | { data: ProjectDTO }
      >(`${this.basePath}/${params.id}`, body, {
        headers: { "Content-Type": "application/json" },
      });

      const raw = res.data as
        | ProjectDTO
        | { project: ProjectDTO }
        | { data: ProjectDTO };

      const dto: ProjectDTO =
        (raw as { project?: ProjectDTO }).project ??
        (raw as { data?: ProjectDTO }).data ??
        (raw as ProjectDTO);

      return mapProjectFromDTO(dto);
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Elimina un proyecto */
  async deleteProject(id: ProjectId): Promise<void> {
    try {
      await httpClient.delete<void>(`${this.basePath}/${id}`);
    } catch (err) {
      throw toApiError(err);
    }
  }

  /** Archiva un proyecto (status → ARCHIVED, etc.) */
  async archive(id: ProjectId): Promise<Project> {
    try {
      const res = await httpClient.post<
        ProjectDTO | { project: ProjectDTO } | { data: ProjectDTO }
      >(`${this.basePath}/${id}/archive`);

      const raw = res.data as
        | ProjectDTO
        | { project: ProjectDTO }
        | { data: ProjectDTO };

      const dto: ProjectDTO =
        (raw as { project?: ProjectDTO }).project ??
        (raw as { data?: ProjectDTO }).data ??
        (raw as ProjectDTO);

      return mapProjectFromDTO(dto);
    } catch (err) {
      throw toApiError(err);
    }
  }
}

/** Singleton listo para inyectar donde lo necesites */
export const projectsRepoImpl = new ProjectsRepoHttp();
