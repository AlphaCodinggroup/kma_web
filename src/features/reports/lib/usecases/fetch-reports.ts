import type { ReportsRepo } from "@entities/report/api/reports.repo";
import type {
  ReportListFilter,
  ReportListPage,
} from "@entities/report/model/report-list";

/**
 * Caso de uso: obtener listado de reports.
 */
export async function fetchReports(
  repo: ReportsRepo,
  filters?: ReportListFilter
): Promise<ReportListPage> {
  return await repo.list(filters);
}
