import type { AuditStatus } from "@entities/audit/model";
import type { AuditReport } from "@entities/report/model/audit-report";

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
};

const toStatus = (raw: string): AuditStatus => raw as AuditStatus;

const toNullIfEmpty = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
};

export const mapAuditReportDTO = (dto: AuditReportDTO): AuditReport => {
  return {
    id: dto.id,
    flowId: toNullIfEmpty(dto.flow_id ?? null),
    userId: toNullIfEmpty(dto.user_id ?? null),
    status: toStatus(dto.status),
    reportName: toNullIfEmpty(dto.report_name ?? null),
    reportUrl: toNullIfEmpty(dto.report_url ?? null),
    createdAt: dto.created_at,
    updatedAt: dto.updated_at ?? null,
    completedAt: dto.completed_at ?? null,
  };
};
