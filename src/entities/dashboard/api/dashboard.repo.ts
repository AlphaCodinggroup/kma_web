import type { DashboardSummary } from "@entities/dashboard/model/dashboard";

export interface DashboardRepo {
  getSummary(): Promise<DashboardSummary>;
}
