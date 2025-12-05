import type {
  ProjectListFilter,
  ProjectListPage,
  ProjectId,
  Project,
  CreateProjectParams,
  CreateProjectResult,
  UpdateProjectParams,
  UpdateProjectResult,
} from "../model";

export interface ProjectsRepo {
  /** Obtiene lista paginada de proyectos */
  getProjects(params?: ProjectListFilter): Promise<ProjectListPage>;

  /** Obtiene detalle de un proyecto por ID (opcional) */
  getById?(id: ProjectId): Promise<Project>;

  /** Crea un nuevo proyecto */
  create(params: CreateProjectParams): Promise<CreateProjectResult>;

  /** Actualiza un proyecto existente */
  update(params: UpdateProjectParams): Promise<UpdateProjectResult>;

  /** Elimina un proyecto */
  deleteProject(id: ProjectId): Promise<void>;

  /**
   * Archiva un proyecto (por ejemplo, status → ARCHIVED).
   */
  archive(id: ProjectId): Promise<Project>;
}
