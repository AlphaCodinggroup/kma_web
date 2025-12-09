import type { AuditReviewDetail } from "@entities/audit/model/audit-review";
import type { CompleteReviewResult } from "@entities/audit/model/completeReview";
import type {
  AuditReviewStatusChange,
  UpdateAuditReviewStatusInput,
} from "@entities/audit/model/audit-review-status";

export interface AuditReviewDetailRepo {
  getReviewDetail(auditId: string): Promise<AuditReviewDetail>;
  completeReview(auditId: string): Promise<CompleteReviewResult>;
  updateStatus(
    input: UpdateAuditReviewStatusInput
  ): Promise<AuditReviewStatusChange>;
}
