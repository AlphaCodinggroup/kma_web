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
export type ReportListItemDTO = AuditReportDTO & {
  completed_at?: string | null;
  project_id?: string | null;
};

/**
 * DTO de respuesta del endpoint GET /reports
 */
export type ReportsListResponseDTO = {
  reports: ReportListItemDTO[];
  count: number;
  last_eval_id?: string | null;
  has_more?: boolean;
};

/**
 * Normaliza strings vacíos a null.
 */
const toNullableString = (value: string | null | undefined): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Mapea un DTO de report de listado → modelo de dominio ReportListItem.
 */
export const mapReportListItemFromDTO = (
  dto: ReportListItemDTO
): ReportListItem => {
  const base = mapAuditReportDTO(dto);

  return {
    ...base,
    projectId: toNullableString(dto.project_id ?? null),
    completedAt: dto.completed_at ?? null,
  };
};

/**
 * Mapea la respuesta completa del endpoint → ReportListPage de dominio.
 */
export const mapReportsListFromDTO = (
  response: ReportsListResponseDTO
): ReportListPage => {
  const { reports, count, last_eval_id, has_more } = response;

  const total =
    typeof count === "number" && !Number.isNaN(count) ? count : reports.length;

  return {
    items: reports.map(mapReportListItemFromDTO),
    count: total,
    lastEvalId: last_eval_id ?? null,
    hasMore: Boolean(has_more),
  };
};
