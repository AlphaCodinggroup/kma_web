import type { AuditStatus } from "@entities/audit/model";

export interface CompleteReviewResult {
  auditId: string;
  status: AuditStatus;
  message: string;
  requestId: string;
}
