import { httpClient } from "@shared/api/http.client";
import type { ApiError } from "@shared/interceptors/error";
import type { ReportsRepo } from "@entities/report/api/reports.repo";
import type {
  ReportListFilter,
  ReportListPage,
} from "@entities/report/model/report-list";
import {
  mapReportsListFromDTO,
  type ReportsListResponseDTO,
} from "@entities/report/lib/report-list.mappers";

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

/**
 * Implementación axios del repositorio de Reports (listado/paginado).
 * Pega contra la ruta interna Next `/api/reports`,
 * que a su vez proxyea al upstream real.
 */
export class ReportsRepoHttp implements ReportsRepo {
  constructor(private readonly basePath: string = "/api/reports") {}

  async list(filter?: ReportListFilter): Promise<ReportListPage> {
    try {
      const { data } = await httpClient.get<ReportsListResponseDTO>(
        this.basePath,
        {
          params: {
            project_id: filter?.projectId,
            user_id: filter?.userId,
            status: filter?.status,
            limit: filter?.limit,
            last_eval_id: filter?.lastEvalId,
          },
        }
      );

      return mapReportsListFromDTO(data);
    } catch (err) {
      throw toApiError(err);
    }
  }
}

/** Instancia por defecto para consumo desde UI / hooks. */
export const reportsRepo: ReportsRepo = new ReportsRepoHttp();
export default reportsRepo;
