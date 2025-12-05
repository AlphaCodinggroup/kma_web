import type { ReportsRepo } from "@entities/report/api/reports.repo";
import type { ReportListItem } from "@entities/report/model/report-list";

/**
 * Caso de uso: obtener un reporte por ID de auditoría.
 */
export async function fetchReportById(
  repo: ReportsRepo,
  id: string
): Promise<ReportListItem> {
  if (!id) {
    throw new Error("Report id is required");
  }

  return await repo.getById(id);
}
