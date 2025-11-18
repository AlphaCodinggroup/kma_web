import type { Options, Project, ProjectListPage } from "../model";

export interface ProjectDTO {
  project_id: string;
  code?: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "ARCHIVED";
  users: Options[];
  facilities: Options[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ProjectsResponseDTO {
  data: {
    projects: ProjectDTO[];
    limit?: number;
    cursor?: string;
  };
  status: string;
}

/** Mapeo DTO -> Dominio */
export function mapProjectFromDTO(dto: ProjectDTO): Project {
  return {
    id: dto.project_id,
    code: dto.code ?? "",
    name: dto.name,
    description: dto.description ?? "",
    status: dto.status,
    users: dto.users?.map((u) => ({ id: u.id, name: u.name })) ?? [],
    facilities: dto.facilities?.map((f) => ({ id: f.id, name: f.name })) ?? [],
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    createdBy: dto.created_by,
  };
}

/** Lista paginada */
export function mapProjectsListFromDTO(
  response: ProjectsResponseDTO
): ProjectListPage {
  const { projects, limit, cursor } = response.data;

  return {
    items: projects.map(mapProjectFromDTO),
    limit: typeof limit === "number" ? limit : 0,
    cursor: cursor ?? "",
  };
}
