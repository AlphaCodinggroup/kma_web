import { httpClient } from "@shared/api/http.client";
import type { DashboardRepo } from "@entities/dashboard/api/dashboard.repo";
import type { DashboardSummary } from "@entities/dashboard/model/dashboard";
import {
  mapDashboardSummaryDTO,
  type DashboardSummaryDTO,
} from "@entities/dashboard/lib/mappers";
import { toApiError, type ApiError } from "@shared/interceptors/error";

export class DashboardRepoHttp implements DashboardRepo {
  constructor(private readonly basePath = "/api/dashboard") {}

  async getSummary(): Promise<DashboardSummary> {
    try {
      const res = await httpClient.get<DashboardSummaryDTO>(this.basePath);
      return mapDashboardSummaryDTO(res.data);
    } catch (err) {
      throw toApiError(err);
    }
  }
}

/** Instancia lista para uso en UI. */
export const dashboardRepoImpl = new DashboardRepoHttp();
