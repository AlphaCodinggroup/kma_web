import type { AuditReviewDetail } from "@entities/audit/model/audit-review";

export interface AuditReviewDetailRepo {
  getReviewDetail(auditId: string): Promise<AuditReviewDetail>;
}
