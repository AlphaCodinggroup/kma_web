import type {
  ProjectListFilter,
  ProjectListPage,
  ProjectId,
  Project,
} from "../model";

export interface ProjectsRepo {
  /**
   * Obtiene una lista paginada de proyectos.
   * Admite filtros por estado, búsqueda, cursor y ordenamiento.
   */
  getProjects(params?: ProjectListFilter): Promise<ProjectListPage>;

  /**
   * Obtiene el detalle de un proyecto específico por su ID.
   * En este MVP podríamos no implementarlo aún si el endpoint no existe, pero dejamos la firma.
   */
  getById?(id: ProjectId): Promise<Project>;
}
