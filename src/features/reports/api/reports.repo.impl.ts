import { httpClient } from "@shared/api/http.client";
import { toApiError, type ApiError } from "@shared/interceptors/error";
import type { ReportsRepo } from "@entities/report/api/reports.repo";
import type {
  ReportListFilter,
  ReportListItem,
  ReportListPage,
} from "@entities/report/model/report-list";
import {
  mapReportsListFromDTO,
  mapReportListItemFromDTO,
  type ReportsListResponseDTO,
  type ReportListItemDTO,
} from "@entities/report/lib/report-list.mappers";

/**
 * Implementación axios del repositorio de Reports.
 *
 * Pega contra la ruta interna Next `/api/reports`,
 * que a su vez proxyea al upstream real.
 */
export class ReportsRepoHttp implements ReportsRepo {
  constructor(private readonly basePath: string = "/api/reports") { }

  async list(filter?: ReportListFilter): Promise<ReportListPage> {
    try {
      const { data } = await httpClient.get<ReportsListResponseDTO>(
        this.basePath,
        {
          params: {
            user_id: filter?.userId,
            status: filter?.status,
            limit: filter?.limit,
            last_eval_id: filter?.lastEvalId,
            include_archived: filter?.includeArchived,
          },
        }
      );

      return mapReportsListFromDTO(data);
    } catch (err) {
      throw toApiError(err);
    }
  }

  /**
   * Obtiene un reporte por ID de auditoría.
   *
   * - 200: status "completed"       → report_url listo para descarga
   * - 202: status "generating_report" → report_url = null, sigue en proceso
   */
  async getById(id: string): Promise<ReportListItem> {
    try {
      const { data } = await httpClient.get<ReportListItemDTO>(
        `${this.basePath}/${encodeURIComponent(id)}`
      );

      return mapReportListItemFromDTO(data);
    } catch (err) {
      throw toApiError(err);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await httpClient.delete(`${this.basePath}/${encodeURIComponent(id)}`);
    } catch (err) {
      throw toApiError(err);
    }
  }

  async restore(id: string): Promise<void> {
    try {
      await httpClient.post(`${this.basePath}/${encodeURIComponent(id)}/restore`, {});
    } catch (err) {
      throw toApiError(err);
    }
  }
}

/** Instancia por defecto para consumo desde UI / hooks. */
export const reportsRepo: ReportsRepo = new ReportsRepoHttp();
export default reportsRepo;
