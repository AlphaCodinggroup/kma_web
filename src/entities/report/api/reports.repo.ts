import type {
  ReportListFilter,
  ReportListItem,
  ReportListPage,
} from "@entities/report/model/report-list";

/**
 * Repositorio de Reports (listado/paginado).
 */
export interface ReportsRepo {
  /**
   * Lista reports con filtros opcionales y paginación.
   */
  list(filter?: ReportListFilter): Promise<ReportListPage>;

  /**
   * Obtiene un reporte por ID de auditoría.
   */
  getById(id: string): Promise<ReportListItem>;

  /**
   * Elimina un reporte por ID de auditoría.
   */
  delete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}
