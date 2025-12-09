import type { AuditStatus } from "@entities/audit/model";

export interface AuditReviewStatusChange {
  auditId: string;
  oldStatus: AuditStatus;
  newStatus: AuditStatus;
  message: string;
}

export interface UpdateAuditReviewStatusInput {
  auditId: string;
  status: AuditStatus;
}
