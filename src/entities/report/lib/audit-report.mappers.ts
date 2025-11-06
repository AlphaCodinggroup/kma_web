import type {
  AuditReport,
  ReportStatus,
} from "@entities/report/model/audit-report";

export type AuditReportDTO = {
  id: string;
  flow_id: string;
  user_id?: string | null;
  status: string;
  report_url?: string | null;
  created_at: string;
  updated_at: string;
};

const toStatus = (raw: string): ReportStatus => raw as ReportStatus;

const toNullIfEmpty = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
};

export const mapAuditReportDTO = (dto: AuditReportDTO): AuditReport => {
  return {
    id: dto.id,
    flowId: dto.flow_id,
    userId: toNullIfEmpty(dto.user_id ?? null),
    status: toStatus(dto.status),
    reportUrl: toNullIfEmpty(dto.report_url ?? null),
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
};
