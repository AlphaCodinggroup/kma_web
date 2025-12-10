import type {
  ReportListItem,
  ReportListPage,
} from "@entities/report/model/report-list";
import {
  mapAuditReportDTO,
  type AuditReportDTO,
} from "@entities/report/lib/audit-report.mappers";

/**
 * DTO de cada item en el listado de reports.
 */
export type ReportListItemDTO = AuditReportDTO;

/**
 * DTO de respuesta del endpoint GET /reports.
 */
export type ReportsListResponseDTO = {
  reports: ReportListItemDTO[];
  count: number;
  last_eval_id?: string | null;
  has_more?: boolean;
};

/**
 * Mapea un DTO de report de listado a modelo de dominio ReportListItem.
 */
export const mapReportListItemFromDTO = (
  dto: ReportListItemDTO
): ReportListItem => {
  return mapAuditReportDTO(dto);
};

/**
 * Mapea la respuesta completa del endpoint a ReportListPage de dominio.
 */
export const mapReportsListFromDTO = (
  response: ReportsListResponseDTO
): ReportListPage => {
  const { reports, count, has_more, last_eval_id } = response;

  const total =
    typeof count === "number" && !Number.isNaN(count) ? count : reports.length;

  return {
    items: reports.map(mapReportListItemFromDTO),
    count: total,
    lastEvalId: last_eval_id ?? null,
    hasMore: Boolean(has_more),
  };
};
