import { httpClient } from "@shared/api/http.client";
import type { DashboardRepo } from "@entities/dashboard/api/dashboard.repo";
import type { DashboardSummary } from "@entities/dashboard/model/dashboard";
import {
  mapDashboardSummaryDTO,
  type DashboardSummaryDTO,
} from "@entities/dashboard/lib/mappers";
import type { ApiError } from "@shared/interceptors/error";

/** Utilidad defensiva: normaliza a ApiError en edge cases */
function toApiError(err: unknown): ApiError {
  if (err && typeof err === "object" && "code" in err && "message" in err) {
    const e = err as { code: string; message: string; details?: unknown };
    return { code: e.code, message: e.message, details: e.details };
  }
  return {
    code: "UNEXPECTED_ERROR",
    message: "Unexpected error",
    details: err,
  } as const;
}

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
