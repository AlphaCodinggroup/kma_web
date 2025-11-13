// src/entities/project/lib/mappers.ts
import type { Project, ProjectListPage } from "../model";

/**
 * Tipos DTO según la respuesta real del endpoint /projects
 * (adaptado a la forma observada en el JSON proporcionado).
 */
export interface ProjectDTO {
  project_id: string;
  code?: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "ARCHIVED";
  user_ids: string[];
  facility_ids: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

/**
 * Forma completa de la respuesta del backend
 * Ejemplo:
 * {
 *   "data": { "projects": ProjectDTO[], "limit": 1, "cursor"?: string },
 *   "status": "success"
 * }
 */
export interface ProjectsResponseDTO {
  data: {
    projects: ProjectDTO[];
    limit?: number;
    cursor?: string;
  };
  status: string;
}

/**
 * Mapeo de un ProjectDTO → Project (dominio)
 */
export function mapProjectFromDTO(dto: ProjectDTO): Project {
  return {
    id: dto.project_id,
    code: dto.code,
    name: dto.name,
    description: dto.description,
    status: dto.status,
    userIds: dto.user_ids,
    facilityIds: dto.facility_ids,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    createdBy: dto.created_by,
  };
}

/**
 * Mapeo de una lista de Projects (respuesta de API → dominio)
 */
export function mapProjectsListFromDTO(
  response: ProjectsResponseDTO
): ProjectListPage {
  const { projects, limit, cursor } = response.data;

  return {
    items: projects.map(mapProjectFromDTO),
    limit,
    cursor,
  };
}
