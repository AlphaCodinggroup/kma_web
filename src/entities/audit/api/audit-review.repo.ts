import type { AuditReviewDetail } from "@entities/audit/model/audit-review";
import type { CompleteReviewResult } from "@entities/audit/model/completeReview";

export interface AuditReviewDetailRepo {
  getReviewDetail(auditId: string): Promise<AuditReviewDetail>;
  completeReview(auditId: string): Promise<CompleteReviewResult>;
}
