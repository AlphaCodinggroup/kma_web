import type {
  ProjectListFilter,
  ProjectListPage,
  ProjectId,
  Project,
  CreateProjectParams,
  CreateProjectResult,
} from "../model";

export interface ProjectsRepo {
  /** Obtiene lista paginada de proyectos */
  getProjects(params?: ProjectListFilter): Promise<ProjectListPage>;

  /** Obtiene detalle de un proyecto por ID (opcional) */
  getById?(id: ProjectId): Promise<Project>;

  /** Crea un nuevo proyecto */
  create(params: CreateProjectParams): Promise<CreateProjectResult>;

  /** Elimina un proyecto */
  deleteProject(id: ProjectId): Promise<void>;
}
