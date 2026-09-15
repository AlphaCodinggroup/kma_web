import { toAuditStatus } from "@entities/audit/lib/audit-status";
import { toIsoDate, toIsoDateOrNull } from "@shared/lib/coerce";
import type { AuditStatus } from "@entities/audit/model";
import type { AuditReport } from "@entities/report/model/audit-report";

export type ReportProgressDTO = {
  request_id?: string | null;
  step?: string | null;
  photos_done?: number | null;
  photos_total?: number | null;
  percent?: number | null;
  updated_at?: string | null;
};

export type AuditReportDTO = {
  id: string;
  flow_id?: string | null;
  user_id?: string | null;
  status: string;
  report_name?: string | null;
  report_url?: string | null;
  created_at: string;
  updated_at?: string | null;
  completed_at?: string | null;
  report_progress?: ReportProgressDTO | null;
};

// El estado se valida contra la lista de estados conocidos: antes era un cast
// y cualquier string entraba al dominio como AuditStatus.
const toStatus = (raw: unknown): AuditStatus => toAuditStatus(raw);

const toNullIfEmpty = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
};

const toFiniteNumberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export const mapAuditReportDTO = (dto: AuditReportDTO): AuditReport => {
  return {
    id: dto.id,
    flowId: toNullIfEmpty(dto.flow_id ?? null),
    userId: toNullIfEmpty(dto.user_id ?? null),
    status: toStatus(dto.status),
    reportName: toNullIfEmpty(dto.report_name ?? null),
    reportUrl: toNullIfEmpty(dto.report_url ?? null),
    // Las fechas pasan por la misma validación que el resto de los campos:
    // antes se copiaban tal cual y una inválida llegaba a la interfaz.
    createdAt: toIsoDate(dto.created_at),
    updatedAt: toIsoDateOrNull(dto.updated_at),
    completedAt: toIsoDateOrNull(dto.completed_at),
    reportProgress: dto.report_progress
      ? {
          requestId: toNullIfEmpty(dto.report_progress.request_id),
          step: toNullIfEmpty(dto.report_progress.step),
          photosDone: toFiniteNumberOrNull(dto.report_progress.photos_done),
          photosTotal: toFiniteNumberOrNull(dto.report_progress.photos_total),
          percent: toFiniteNumberOrNull(dto.report_progress.percent),
          updatedAt: toIsoDateOrNull(dto.report_progress.updated_at),
        }
      : null,
  };
};
