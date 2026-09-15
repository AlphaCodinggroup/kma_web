export type ProjectId = string;

export type ProjectStatus = "ACTIVE" | "ARCHIVED";

export type Options = { id: string; name: string };

export interface Project {
  id: ProjectId;
  name: string;
  code?: string;
  description?: string;
  status: ProjectStatus;
  users: Options[];
  facilities: Options[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Resultado paginado para listados de Projects.
 */
export interface ProjectListPage {
  items: Project[];
  limit?: number;
  cursor?: string;
}

/**
 * Filtros de búsqueda de dominio
 */
export interface ProjectListFilter {
  limit?: number;
  status?: ProjectStatus;
  search?: string;
  cursor?: string;
  sortBy?: "created_at" | "updated_at" | "name" | "code";
  sortOrder?: "asc" | "desc";
}

/**
 * Parámetros de creación desde la UI/caso de uso (dominio).
 */
export interface CreateProjectParams {
  name: string;
  code?: string;
  description?: string;
  users?: Options[];
  facilities?: Options[];
  status?: ProjectStatus;
}

/**
 * Resultado de creación en dominio: el Project creado.
 */
export type CreateProjectResult = Project;

/**
 * Parámetros de actualización de un proyecto existente.
 */
export interface UpdateProjectParams {
  id: ProjectId;
  name?: string;
  code?: string;
  description?: string;
  users?: Options[];
  facilities?: Options[];
  status?: ProjectStatus;
}

/**
 * Resultado de actualización en dominio: el Project actualizado.
 */
export type UpdateProjectResult = Project;
