import type { ReportJobStatus } from "@entities/audit/model/completeReview";

export interface ReportJobAudit {
  auditId: string;
  auditVersion: number;
  reviewVersion: number;
}

export interface ReportJob {
  jobId: string;
  projectId: string;
  triggerAuditId: string;
  audits: ReportJobAudit[];
  status: ReportJobStatus;
  attempt: number;
  reportKey: string | null;
  errorMessage: string | null;
  retryable: boolean;
  archivedAt: string | null;
}

export type ReportJobDTO = {
  job_id: string;
  project_id: string;
  trigger_audit_id: string;
  audits?: Array<{ audit_id: string; audit_version: number; review_version: number }>;
  status: ReportJobStatus;
  attempt: number;
  report_key?: string | null;
  error_message?: string | null;
  retryable?: boolean;
  archived_at?: string | null;
};

export function mapReportJob(dto: ReportJobDTO): ReportJob {
  return {
    jobId: dto.job_id,
    projectId: dto.project_id,
    triggerAuditId: dto.trigger_audit_id,
    audits: (dto.audits ?? []).map((audit) => ({
      auditId: audit.audit_id,
      auditVersion: audit.audit_version,
      reviewVersion: audit.review_version,
    })),
    status: dto.status,
    attempt: dto.attempt,
    reportKey: dto.report_key ?? null,
    errorMessage: dto.error_message ?? null,
    retryable: Boolean(dto.retryable),
    archivedAt: dto.archived_at ?? null,
  };
}
