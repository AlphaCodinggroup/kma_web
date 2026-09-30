import type {
  ReportListFilter,
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
   * Elimina un reporte por ID de auditoría.
   */
  delete(id: string): Promise<void>;
}
