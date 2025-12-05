import type { DashboardRepo } from "@entities/dashboard/api/dashboard.repo";
import type { DashboardSummary } from "@entities/dashboard/model/dashboard";
import { dashboardRepoImpl } from "@features/dashboard/api/dashboard.repo.impl";

/**
 * Caso de uso: obtener el resumen principal del dashboard.
 */
export async function getDashboardSummary(
  repo: DashboardRepo = dashboardRepoImpl
): Promise<DashboardSummary> {
  return repo.getSummary();
}
