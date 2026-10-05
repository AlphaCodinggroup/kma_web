import {
  asArray,
  toFiniteNumber,
  toIsoDate,
  toIsoDateOrNull,
} from "@shared/lib/coerce";
import type { Options, Project, ProjectListPage } from "../model";

export interface ProjectDTO {
  project_id: string;
  code?: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "ARCHIVED";
  users: Options[];
  facilities: Array<{ facility_id: string; project_id?: string; name: string }>;
  created_at: string;
  updated_at: string;
  created_by: string;
  archived_at?: string | null;
  archived_by?: string | null;
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
    facilities: dto.facilities?.map((f) => ({ id: f.facility_id, name: f.name })) ?? [],
    // Las fechas se validan: una inválida llegaba a la interfaz y se mostraba
    // como "Invalid Date".
    createdAt: toIsoDate(dto.created_at),
    updatedAt: toIsoDate(dto.updated_at),
    createdBy: dto.created_by,
    ...(dto.archived_at !== undefined
      ? { archivedAt: toIsoDateOrNull(dto.archived_at) }
      : {}),
    ...(dto.archived_by !== undefined
      ? { archivedBy: dto.archived_by ?? null }
      : {}),
  };
}

/** Lista paginada */
export function mapProjectsListFromDTO(
  response: ProjectsResponseDTO
): ProjectListPage {
  // Guarda sobre `data`: una respuesta malformada rompía el mapper en vez de
  // degradar a una página vacía.
  const data = response?.data ?? ({} as ProjectsResponseDTO["data"]);
  const { projects, limit, cursor } = data;

  return {
    items: asArray<ProjectDTO>(projects).map(mapProjectFromDTO),
    // El backend puede mandar el limit como string: descartarlo lo dejaba en 0
    // y la interfaz creía que no había página.
    limit: toFiniteNumber(limit, 0),
    cursor: cursor ?? "",
  };
}
